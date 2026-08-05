# LDAP Module

## Manual testing

You can test LDAP sync end-to-end using Docker and an LDAP server image — nothing else needs to be installed. The image lets us create and edit users freely, so we can simulate real scenarios (new hires, renamed users, deprovisioned users) without touching a real LDAP directory.

**1. Start n8n**. In this example it will be running locally without Docker and available on http://localhost:5678

**2. Start a mock LDAP server in Docker:**

```bash
docker run -d --name n8n-ldap-test -p 11389:389 \
  -e LDAP_ORGANISATION="n8n" -e LDAP_DOMAIN="n8n.local" \
  -e LDAP_ADMIN_PASSWORD="admin" \
  osixia/openldap:latest
```

This bootstraps `dc=n8n,dc=local` with an admin bind at `cn=admin,dc=n8n,dc=local` / `admin`. The host port is `11389` (not the standard `389`) to avoid needing elevated privileges to bind it.

Wait a few seconds for the container to finish starting up before continuing.

**3. Create a test user** by piping an LDIF straight into the container:

```bash
docker exec -i n8n-ldap-test ldapadd -x -D "cn=admin,dc=n8n,dc=local" -w admin <<'EOF'
dn: ou=users,dc=n8n,dc=local
objectClass: organizationalUnit
ou: users

dn: uid=jdoe,ou=users,dc=n8n,dc=local
objectClass: inetOrgPerson
cn: John Doe
sn: Doe
givenName: John
mail: jdoe@n8n.local
uid: jdoe
userPassword: password123
EOF
```

To edit an existing user later (e.g. to test a renamed user syncing correctly — change first name and last name), use `ldapmodify` the same way:

```bash
docker exec -i n8n-ldap-test ldapmodify -x -D "cn=admin,dc=n8n,dc=local" -w admin <<'EOF'
dn: uid=jdoe,ou=users,dc=n8n,dc=local
changetype: modify
replace: givenName
givenName: Jonathan
-
replace: sn
sn: Doeson
EOF
```

To remove a user (e.g. to test that a deprovisioned user gets disabled in n8n on the next sync), use `ldapdelete`:

```bash
docker exec -i n8n-ldap-test ldapdelete -x -D "cn=admin,dc=n8n,dc=local" -w admin "uid=jdoe,ou=users,dc=n8n,dc=local"
```

**4. Configure LDAP in n8n.** Either through Settings → LDAP in the UI, or via the public API — you'll need an API key first (Settings → API):

```bash
curl -X PUT http://localhost:5678/api/v1/settings/ldap \
  -H "X-N8N-API-KEY: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionUrl": "127.0.0.1",
    "connectionPort": 11389,
    "connectionSecurity": "none",
    "allowUnauthorizedCerts": true,
    "bindingAdminDn": "cn=admin,dc=n8n,dc=local",
    "bindingAdminPassword": "admin",
    "baseDn": "dc=n8n,dc=local",
    "loginIdAttribute": "mail",
    "ldapIdAttribute": "uid",
    "emailAttribute": "mail",
    "firstNameAttribute": "givenName",
    "lastNameAttribute": "sn",
    "userFilter": "",
    "loginEnabled": true,
    "loginLabel": "LDAP",
    "synchronizationEnabled": false,
    "synchronizationInterval": 60,
    "searchPageSize": 0,
    "searchTimeout": 60,
    "enforceEmailUniqueness": true
  }'
```

Use `127.0.0.1`, not `localhost`, for `connectionUrl`: on Docker Desktop for Mac, `localhost` can resolve to `::1` first and the container only forwards the port over IPv4, so it fails to connect.

**5. Run a sync.** Either Settings → LDAP → Synchronize in the UI, or via the public API:

```bash
curl -X POST http://localhost:5678/api/v1/settings/ldap/sync \
  -H "X-N8N-API-KEY: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"type": "live"}'
```

- `"type": "dry"` — reports `created: 1`, but no user is actually added yet (check Users list is unchanged).
- `"type": "live"` — actually creates the user. Check Users list: John Doe / jdoe@n8n.local should now appear as a Member.

**6. Verify login:** log out and sign in with `jdoe@n8n.local` / `password123` — this should authenticate against the LDAP server rather than n8n's local password store.

**7. Verify disable behavior:** delete the user from LDAP (`ldapdelete`, above) and sync again — the corresponding n8n user should become disabled (not deleted).

**8. Clean up.** Disable LDAP login first (Settings → LDAP, uncheck login, or `GET /settings/ldap` then `PUT /settings/ldap` with the full returned object but `loginEnabled: false`) — otherwise n8n is left with LDAP as its active authentication method and no LDAP server to validate logins against. Then remove the container:

```bash
docker rm -f n8n-ldap-test
```
