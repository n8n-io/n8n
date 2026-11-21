-- Private site: accounts on invitation, approval by the super admin, read-only data (D57).
-- The super admin e-mail is not in this public file: it is stored in private.settings
-- with a separate SQL statement (see football-intel/web/README.md).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.settings (
  key   text primary key,
  value text not null
);
insert into private.settings (key, value) values ('open_signup', 'false')
on conflict (key) do nothing;

-- Accounts --------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  -- 'admin' is prepared but not used yet (D57).
  role         text not null default 'user' check (role in ('superadmin', 'admin', 'user')),
  status       text not null default 'en_attente'
               check (status in ('en_attente', 'actif', 'refuse', 'suspendu')),
  invite_code  text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   uuid references auth.users (id) on delete set null
);

create table public.invite_codes (
  code       text primary key,
  note       text,
  max_uses   int not null default 1 check (max_uses > 0),
  uses       int not null default 0,
  expires_at timestamptz not null default now() + interval '7 days',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id     bigint generated always as identity primary key,
  actor  uuid references auth.users (id) on delete set null,
  action text not null,
  target uuid,
  detail jsonb,
  at     timestamptz not null default now()
);

-- Dashboard data: one row for each API answer, written by the daily export.
create table public.snapshots (
  path       text primary key,
  body       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Helpers ---------------------------------------------------------------------

create function private.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and status = 'actif');
$$;

create function private.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = (select auth.uid()) and status = 'actif' and role = 'superadmin');
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_active() to authenticated;
grant execute on function private.is_superadmin() to authenticated;

-- New account: valid invitation code, or the super admin e-mail, or open signup.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_code   text := nullif(trim(new.raw_user_meta_data ->> 'invite_code'), '');
  v_name   text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  v_owner  text;
  v_open   boolean;
  v_found  boolean := false;
begin
  select value into v_owner from private.settings where key = 'superadmin_email';
  if v_owner is not null and lower(new.email) = lower(v_owner) then
    insert into public.profiles (id, email, display_name, role, status, decided_at)
    values (new.id, new.email, v_name, 'superadmin', 'actif', now());
    return new;
  end if;

  if v_code is not null then
    update public.invite_codes
       set uses = uses + 1
     where code = v_code and uses < max_uses and expires_at > now()
    returning true into v_found;
  end if;

  select coalesce(value = 'true', false) into v_open from private.settings where key = 'open_signup';
  if not coalesce(v_found, false) and not coalesce(v_open, false) then
    raise exception 'invalid_invite_code' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email, display_name, invite_code)
  values (new.id, new.email, v_name, case when v_found then v_code end);
  insert into public.audit_log (actor, action, target, detail)
  values (new.id, 'signup', new.id, jsonb_build_object('invite_code', v_code));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Super admin actions -----------------------------------------------------------

create function public.set_account_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('actif', 'refuse', 'suspendu') then
    raise exception 'invalid_status';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'cannot_change_own_account';
  end if;
  update public.profiles
     set status = p_status, decided_at = now(), decided_by = (select auth.uid())
   where id = p_user and role <> 'superadmin';
  if not found then
    raise exception 'unknown_account';
  end if;
  insert into public.audit_log (actor, action, target, detail)
  values ((select auth.uid()), 'set_status', p_user, jsonb_build_object('status', p_status));
end;
$$;

create function public.create_invite(p_note text default null, p_max_uses int default 1,
                                     p_days int default 7) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  if not private.is_superadmin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.invite_codes (code, note, max_uses, expires_at, created_by)
  values (v_code, p_note, greatest(1, least(p_max_uses, 50)),
          now() + make_interval(days => greatest(1, least(p_days, 60))), (select auth.uid()));
  insert into public.audit_log (actor, action, detail)
  values ((select auth.uid()), 'create_invite', jsonb_build_object('code', v_code, 'note', p_note));
  return v_code;
end;
$$;

revoke execute on function public.set_account_status(uuid, text) from public, anon;
revoke execute on function public.create_invite(text, int, int) from public, anon;
grant execute on function public.set_account_status(uuid, text) to authenticated;
grant execute on function public.create_invite(text, int, int) to authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- Row level security ------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.invite_codes enable row level security;
alter table public.audit_log    enable row level security;
alter table public.snapshots    enable row level security;

create policy "own profile or super admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_superadmin()));

create policy "super admin reads invitations" on public.invite_codes
  for select to authenticated using ((select private.is_superadmin()));
create policy "super admin deletes invitations" on public.invite_codes
  for delete to authenticated using ((select private.is_superadmin()));

create policy "super admin reads the journal" on public.audit_log
  for select to authenticated using ((select private.is_superadmin()));

create policy "active accounts read the data" on public.snapshots
  for select to authenticated using ((select private.is_active()));

-- No write policy on any table: changes go through the functions above, and the
-- daily export uses the secret key, which bypasses row level security.
revoke all on public.profiles, public.invite_codes, public.audit_log, public.snapshots from anon;
revoke insert, update, delete, truncate on public.profiles, public.audit_log, public.snapshots
  from authenticated;
revoke insert, update, truncate on public.invite_codes from authenticated;
