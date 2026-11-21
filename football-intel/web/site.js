/* Private site layer (D57): Supabase sign-in, account request with an invitation code,
   approval by the super admin, and the dashboard data read from the `snapshots` table.
   Loaded before app.js / value.js, which wait for window.fiReady. */
(() => {
  const cfg = window.FI_CONFIG;
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  const h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let profile = null;
  let release;
  window.FI_READ_ONLY = true;
  window.fiReady = new Promise((resolve) => { release = resolve; });

  /* ---------- Data ---------- */
  window.fiGet = async (path) => {
    let key = path.replace(/\?$/, "");
    // Only the default period of a competition is exported.
    if (key.startsWith("/competition/")) key = key.split("?")[0];
    const { data, error } = await sb.from("snapshots").select("body").eq("path", key).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("donnée non publiée sur le site en ligne");
    return data.body;
  };

  /* ---------- Sign-in screen ---------- */
  const ERRORS = {
    "Invalid login credentials": "E-mail ou mot de passe incorrect.",
    "Email not confirmed": "Confirmez d'abord votre adresse avec le lien reçu par e-mail.",
    "Database error saving new user": "Code d'invitation invalide, expiré ou déjà utilisé.",
    "User already registered": "Un compte existe déjà avec cette adresse.",
  };
  const fr = (e) => ERRORS[e?.message] || (/rate limit/i.test(e?.message || "") ? "Trop de tentatives. Réessayez dans quelques minutes." : e?.message || "Erreur inconnue.");

  const gate = document.createElement("div");
  gate.id = "fi-gate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  document.body.appendChild(gate);
  document.documentElement.classList.add("fi-locked");

  function screen(title, body) {
    gate.innerHTML = `<div class="fi-card"><div class="fi-brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span> Football Intel</div>
      <h1>${h(title)}</h1>${body}</div>`;
    gate.hidden = false;
    document.documentElement.classList.add("fi-locked");
  }
  const msg = (id, text, ok) => { const el = document.getElementById(id); el.textContent = text; el.className = ok ? "fi-msg ok" : "fi-msg"; };

  function signInScreen(tab) {
    const invite = new URLSearchParams(location.search).get("invite") || "";
    tab = tab || (invite ? "request" : "login");
    const tabs = `<div class="fi-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${tab === "login"}" data-tab="login">Se connecter</button>
      <button type="button" role="tab" aria-selected="${tab === "request"}" data-tab="request">Demander un compte</button></div>`;
    const login = `<form id="fi-login" class="fi-form">
      <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <label>Mot de passe<input name="password" type="password" autocomplete="current-password" required></label>
      <button class="btn" type="submit">Se connecter</button>
      <button class="fi-link" type="button" id="fi-forgot">Mot de passe oublié</button>
      <p id="fi-m" class="fi-msg" aria-live="polite"></p></form>`;
    const request = `<form id="fi-request" class="fi-form">
      <p class="fi-note">Site privé. Il faut un code d'invitation. Le compte est ensuite validé par l'administrateur.</p>
      <label>Nom affiché<input name="name" autocomplete="name" maxlength="60" required></label>
      <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
      <label>Mot de passe (10 caractères minimum)<input name="password" type="password" autocomplete="new-password" minlength="10" required></label>
      <label>Code d'invitation<input name="code" value="${h(invite)}" autocomplete="off" required></label>
      <button class="btn" type="submit">Envoyer la demande</button>
      <p id="fi-m" class="fi-msg" aria-live="polite"></p></form>`;
    screen(tab === "login" ? "Connexion" : "Demande de compte", tabs + (tab === "login" ? login : request));
    gate.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => signInScreen(b.dataset.tab));
    if (tab === "login") {
      document.getElementById("fi-login").onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        msg("fi-m", "Connexion…", true);
        const { error } = await sb.auth.signInWithPassword({ email: f.get("email"), password: f.get("password") });
        if (error) msg("fi-m", fr(error));
      };
      document.getElementById("fi-forgot").onclick = async () => {
        const email = document.querySelector("#fi-login [name=email]").value;
        if (!email) return msg("fi-m", "Saisissez d'abord votre e-mail.");
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/" });
        msg("fi-m", error ? fr(error) : "Si un compte existe, un lien de réinitialisation a été envoyé.", !error);
      };
    } else {
      document.getElementById("fi-request").onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        msg("fi-m", "Envoi…", true);
        const { data, error } = await sb.auth.signUp({
          email: f.get("email"), password: f.get("password"),
          options: { emailRedirectTo: location.origin + "/",
                     data: { display_name: f.get("name"), invite_code: String(f.get("code")).trim().toUpperCase() } },
        });
        if (error) return msg("fi-m", fr(error));
        if (!data.session) {
          screen("Demande envoyée", `<p>Confirmez votre adresse avec le lien envoyé par e-mail. L'administrateur doit ensuite valider votre compte.</p>
            <button class="btn" type="button" id="fi-back">Retour à la connexion</button>`);
          document.getElementById("fi-back").onclick = () => signInScreen("login");
        }
      };
    }
  }

  function newPasswordScreen() {
    screen("Nouveau mot de passe", `<form id="fi-np" class="fi-form">
      <label>Nouveau mot de passe (10 caractères minimum)<input name="password" type="password" autocomplete="new-password" minlength="10" required></label>
      <button class="btn" type="submit">Enregistrer</button><p id="fi-m" class="fi-msg" aria-live="polite"></p></form>`);
    document.getElementById("fi-np").onsubmit = async (e) => {
      e.preventDefault();
      const { error } = await sb.auth.updateUser({ password: new FormData(e.target).get("password") });
      if (error) return msg("fi-m", fr(error));
      onSession((await sb.auth.getSession()).data.session);
    };
  }

  const STATUS_TEXT = {
    en_attente: ["Compte en attente", "Votre demande est enregistrée. L'administrateur doit la valider avant que vous puissiez voir les données."],
    refuse: ["Demande refusée", "L'administrateur a refusé cette demande de compte."],
    suspendu: ["Compte suspendu", "Ce compte est suspendu. Contactez l'administrateur."],
  };

  // A session unused for 14 days ends: a lost phone does not stay signed in.
  const IDLE_MS = 14 * 24 * 3600 * 1000;
  const seenAt = () => { try { return Number(localStorage.getItem("fi_seen")) || 0; } catch { return 0; } };
  const markSeen = () => { try { localStorage.setItem("fi_seen", String(Date.now())); } catch { /* storage blocked */ } };

  async function onSession(session) {
    if (!session) { profile = null; return signInScreen(); }
    if (seenAt() && Date.now() - seenAt() > IDLE_MS) { await sb.auth.signOut(); return; }
    markSeen();
    const { data, error } = await sb.from("profiles").select("id,email,display_name,role,status").eq("id", session.user.id).maybeSingle();
    if (error || !data) {
      screen("Profil introuvable", `<p>${h(error?.message || "Aucun profil pour ce compte.")}</p><button class="btn" id="fi-out" type="button">Se déconnecter</button>`);
      return bindOut();
    }
    profile = data;
    if (profile.status !== "actif") {
      const [t, b] = STATUS_TEXT[profile.status] || ["Accès refusé", ""];
      screen(t, `<p>${h(b)}</p><p class="fi-note">${h(profile.email)}</p><button class="btn" id="fi-out" type="button">Se déconnecter</button>`);
      return bindOut();
    }
    gate.hidden = true;
    document.documentElement.classList.remove("fi-locked");
    decorate();
    release();
  }
  function bindOut() { document.getElementById("fi-out").onclick = () => sb.auth.signOut(); }

  /* ---------- Menu: hide local-only pages, add accounts and sign-out ---------- */
  function decorate() {
    document.querySelectorAll('[data-page="picks"], [data-page="admin"]').forEach((a) => a.remove());
    const foot = document.querySelector(".sidebar-foot nav .nav-group");
    if (foot && !document.getElementById("fi-account")) {
      if (profile.role === "superadmin") foot.insertAdjacentHTML("beforeend", `<a href="#/comptes" data-page="comptes">Comptes</a>`);
      foot.insertAdjacentHTML("beforeend", `<a href="#" id="fi-account" title="${h(profile.email)}">Se déconnecter (${h(profile.display_name || profile.email)})</a>`);
      document.getElementById("fi-account").onclick = (e) => { e.preventDefault(); sb.auth.signOut(); };
    }
  }

  /* ---------- Accounts page (super admin) ---------- */
  const STATUS_FR = { en_attente: "en attente", actif: "actif", refuse: "refusé", suspendu: "suspendu" };
  const date = (d) => d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";

  async function accounts() {
    if (profile?.role !== "superadmin") return `<div class="empty"><h2>Accès réservé</h2></div>`;
    const [p, inv, log] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("invite_codes").select("*").order("created_at", { ascending: false }),
      sb.from("audit_log").select("*").order("at", { ascending: false }).limit(50),
    ]);
    const err = p.error || inv.error || log.error;
    if (err) throw new Error(err.message);
    const names = Object.fromEntries(p.data.map((x) => [x.id, x.display_name || x.email]));
    const actions = (u) => {
      if (u.role === "superadmin") return `<span class="small">super admin</span>`;
      const b = (s, label) => `<button class="btn fi-small" type="button" data-user="${u.id}" data-status="${s}">${label}</button>`;
      return { en_attente: b("actif", "Approuver") + b("refuse", "Refuser"), actif: b("suspendu", "Suspendre"),
               suspendu: b("actif", "Réactiver"), refuse: b("actif", "Approuver") }[u.status] || "";
    };
    const pending = p.data.filter((u) => u.status === "en_attente").length;
    const link = (c) => `${location.origin}/?invite=${encodeURIComponent(c)}`;
    setTimeout(bindAccounts, 0);
    return `<h1>Comptes</h1>
      <div class="card"><h2>Demandes et comptes</h2><p class="question">${pending} demande(s) en attente.</p>
        <div class="table-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Statut</th><th>Demandé le</th><th>Code</th><th></th></tr></thead><tbody>
        ${p.data.map((u) => `<tr><td>${h(u.display_name)}</td><td>${h(u.email)}</td><td>${h(STATUS_FR[u.status])}</td><td>${date(u.created_at)}</td><td>${h(u.invite_code)}</td><td class="fi-actions">${actions(u)}</td></tr>`).join("")}
        </tbody></table></div><p id="fi-am" class="fi-msg" aria-live="polite"></p></div>
      <div class="card" style="margin-top:var(--space-4, 16px)"><h2>Codes d'invitation</h2>
        <form id="fi-inv" class="controls">
          <label>Pour qui (note)<input name="note" maxlength="80"></label>
          <label>Utilisations<input name="uses" type="number" min="1" max="50" value="1"></label>
          <label>Valable (jours)<input name="days" type="number" min="1" max="60" value="7"></label>
          <button class="btn" type="submit">Créer un code</button></form>
        <p id="fi-new" class="fi-msg ok" aria-live="polite"></p>
        <div class="table-wrap"><table><thead><tr><th>Code</th><th>Note</th><th>Utilisé</th><th>Expire le</th><th>Lien</th><th></th></tr></thead><tbody>
        ${inv.data.map((c) => `<tr><td><code>${h(c.code)}</code></td><td>${h(c.note)}</td><td>${c.uses}/${c.max_uses}</td><td>${date(c.expires_at)}</td>
          <td><button class="btn fi-small" type="button" data-copy="${h(link(c.code))}">Copier le lien</button></td>
          <td><button class="btn fi-small" type="button" data-del="${h(c.code)}">Supprimer</button></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Aucun code.</td></tr>`}
        </tbody></table></div></div>
      <div class="card" style="margin-top:var(--space-4, 16px)"><h2>Journal</h2>
        <div class="table-wrap"><table><thead><tr><th>Date</th><th>Par</th><th>Action</th><th>Compte</th><th>Détail</th></tr></thead><tbody>
        ${log.data.map((l) => `<tr><td>${date(l.at)}</td><td>${h(names[l.actor] || "")}</td><td>${h(l.action)}</td><td>${h(names[l.target] || "")}</td><td><code>${h(JSON.stringify(l.detail || {}))}</code></td></tr>`).join("")}
        </tbody></table></div></div>`;
  }

  function bindAccounts() {
    const reload = () => window.dispatchEvent(new HashChangeEvent("hashchange"));
    document.querySelectorAll("[data-status]").forEach((b) => b.onclick = async () => {
      b.disabled = true;
      const { error } = await sb.rpc("set_account_status", { p_user: b.dataset.user, p_status: b.dataset.status });
      if (error) { b.disabled = false; return msg("fi-am", fr(error)); }
      reload();
    });
    document.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm(`Supprimer le code ${b.dataset.del} ?`)) return;
      const { error } = await sb.from("invite_codes").delete().eq("code", b.dataset.del);
      if (error) return msg("fi-am", fr(error));
      reload();
    });
    document.querySelectorAll("[data-copy]").forEach((b) => b.onclick = async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copié"; } catch { prompt("Lien à copier :", b.dataset.copy); }
    });
    const form = document.getElementById("fi-inv");
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const { data, error } = await sb.rpc("create_invite", { p_note: f.get("note") || null, p_max_uses: Number(f.get("uses")), p_days: Number(f.get("days")) });
      if (error) return msg("fi-new", fr(error));
      msg("fi-new", `Code créé : ${data}. Lien : ${location.origin}/?invite=${data}`, true);
      setTimeout(reload, 2500);
    };
  }

  window.fiPages = { comptes: accounts };
  window.fiCrumbs = { comptes: "Comptes" };

  /* ---------- Start ---------- */
  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") return newPasswordScreen();
    if (event === "SIGNED_OUT") { location.hash = ""; location.reload(); return; }
    if (event === "SIGNED_IN" && !profile) setTimeout(() => onSession(session), 0);
  });
  sb.auth.getSession().then(({ data }) => {
    if (!/type=recovery/.test(location.hash)) onSession(data.session);
  });
})();
