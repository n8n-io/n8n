# Plan : football-intel en site web avec comptes

Statut : décidé le 2026-10-29. Choix en vigueur : section 10. Mise en œuvre : section 11.

## 1. Ce qui existe déjà

- API FastAPI + tableau de bord (HTML/JS) servis par le même serveur.
- `deploy/install.sh` : installation en une commande sur un VPS Debian/Ubuntu
  (PostgreSQL, services systemd API + planificateur, premier chargement des données).
- `deploy/Caddyfile` : HTTPS automatique + un seul mot de passe pour tout le site.
- Actions d'administration protégées par un jeton unique `ADMIN_TOKEN` (D33, D43).
- Aucun compte utilisateur, aucun rôle.

## 2. Cible

| Rôle | Peut |
|---|---|
| **Super admin** (propriétaire, un seul au départ) | Tout ce que fait l'admin + nommer ou retirer des admins, voir le journal d'audit, changer les réglages sensibles (clés API, sources, modèle actif, retour arrière) |
| **Admin** | Créer, inviter, suspendre et supprimer des utilisateurs ; lancer les cycles de collecte ; voir l'administration |
| **Utilisateur** | Voir les matchs, probabilités, fiches et la fiabilité ; enregistrer ses pronostics (séparés par compte) |

## 3. Choix techniques recommandés

- **Comptes dans l'application** (pas un service externe payant) : tables `users`,
  `sessions`, `invitations`, `audit_log` dans PostgreSQL (migration Alembic).
- Mots de passe hachés avec **Argon2** (`argon2-cffi`) ; jamais stockés en clair.
- **Sessions côté serveur** : cookie `HttpOnly`, `Secure`, `SameSite=Lax`, expiration
  14 jours ; protection CSRF sur les actions qui modifient des données.
- **Inscription sur invitation** (lien à usage unique, valable 7 jours) plutôt
  qu'inscription libre : contrôle de qui voit les données (voir section 5).
- Limitation des tentatives de connexion (anti force brute).
- Super admin créé en ligne de commande sur le serveur
  (`footintel users create-superadmin`), jamais depuis le site.
- Double authentification (TOTP) pour super admin et admins : phase 2.
- Mot de passe oublié : par lien e-mail si un service d'envoi est configuré
  (Resend, Brevo… à choisir) ; sinon réinitialisation par un admin.
- Le mot de passe Caddy global est retiré une fois les comptes en place.
- Les pronostics actuels (table des choix) passent sous l'identifiant de l'utilisateur.

## 4. Hébergement

- VPS (2 vCPU, 4 Go RAM ; environ 4 à 8 €/mois, prix à vérifier) + nom de domaine.
- `deploy/install.sh` existant, puis migration des comptes, puis Caddyfile sans
  `basic_auth`.
- Sauvegarde quotidienne de PostgreSQL hors du serveur.

## 5. Point juridique à trancher avant d'ouvrir des comptes

- **OneFootball** (D50) et **Sofascore** (D56) sont utilisés « pour usage personnel,
  rien de publié ». Un site avec des comptes pour d'autres personnes **publie** ces
  données. Options : masquer aux utilisateurs tout ce qui vient de ces sources
  (compositions, formations, onglet Joueurs, profils tactiques), ou accepter le risque
  par une nouvelle décision explicite.
- **The Odds API** et **football-data.org** : vérifier que leur offre gratuite autorise
  l'affichage à des tiers (attribution déjà en pied de page).
- Si le site devient payant ou présenté comme conseil de paris : conditions bien plus
  strictes (jeux d'argent, protection des consommateurs) ; à vérifier pour la RDC et
  les pays des utilisateurs.

## 6. Décisions du propriétaire (2026-10-29)

1. **Comptes** : le propriétaire seul en **super admin** ; quelques utilisateurs
   **sur invitation uniquement**. Pas d'admin au départ, mais le rôle `admin` est prévu
   dans le modèle (désactivé). Pas d'offre payante.
2. **Inscription libre** : prévue dans le code derrière un réglage
   `FOOTINTEL_OPEN_SIGNUP=false` (désactivée). Seules les invitations fonctionnent.
3. **Données OneFootball/Sofascore** : visibles par les utilisateurs invités (D57).
   Jamais d'accès public : toutes les pages et l'API exigent une session.
4. **Domaine** : `benkassiyfootball.com` (Ben Kassiy + football). Aucune entrée DNS le
   2026-10-29, donc probablement libre ; disponibilité et prix à vérifier chez un
   registraire (Cloudflare, Namecheap, OVH…). À acheter par le propriétaire.
5. **Hébergement** : VPS (section 4), code déployé depuis GitHub. Vercel et Supabase
   écartés : Vercel exécute des fonctions courtes, alors que football-intel fait tourner
   un planificateur et des entraînements de modèle de plusieurs minutes ; la base pèse
   ~1,1 Go, au-dessus de l'offre gratuite de Supabase (500 Mo), et un second
   hébergeur ajouterait un coût et une panne possible sans rien apporter.

## 7. Étapes une fois les réponses connues

1. Modèle de données + migration + commandes CLI (super admin, utilisateurs).
2. Connexion/déconnexion, sessions, invitations, rôles sur chaque route de l'API.
3. Pages : connexion, invitation, gestion des utilisateurs (admin), gestion des admins
   et journal (super admin).
4. Tests : droits par rôle (un utilisateur ne peut pas appeler une route admin, etc.).
5. Déploiement sur le VPS, puis retrait du mot de passe Caddy global.

## 8. Compléments décidés le 2026-10-29 (fin de session)

**Approbation obligatoire.** Toute demande de compte (par lien d'invitation, ou par le
formulaire d'inscription libre s'il est activé un jour) crée un compte `en_attente`. Il ne
peut pas se connecter tant que le super admin ne l'a pas **approuvé** dans la page de
gestion. Le super admin peut aussi refuser, suspendre ou supprimer. Statuts :
`en_attente` → `actif` / `refusé` ; `actif` → `suspendu`.

**Hébergement gratuit (choix du propriétaire).** Par ordre de préférence :
1. **Oracle Cloud Always Free** : 2 cœurs Arm et 12 Go de RAM gratuits à vie, 200 Go de
   disque (documentation Oracle, mise à jour 2026-06-12 ; limites divisées par deux en
   2026). Contraintes : carte bancaire demandée pour vérification (non débitée), région
   choisie à l'inscription définitive, capacité parfois indisponible, et **reprise des
   machines « inactives »** (sur 7 jours : CPU au 95e centile < 20 %, réseau < 20 %,
   mémoire < 20 %). football-intel est souvent calme : risque réel de reprise ; prévoir
   la sauvegarde quotidienne de la base hors de la machine.
2. **Ordinateur du propriétaire + Cloudflare Tunnel** : gratuit, et donne une connexion
   résidentielle utile à Sofascore (D56). L'ordinateur doit rester allumé.

**Domaine.** Un `.com` est payant (environ 10 € par an, à vérifier). Gratuit :
sous-domaine DuckDNS `benkassiyfootball.duckdns.org` (avec Oracle), à remplacer plus tard
par `benkassiyfootball.com` sans changer le site.

## 9. Choix final du propriétaire (2026-10-29) : GitHub + Cloudflare, 0 €

Remplace les sections 3 et 4 pour la version 1. Le dépôt est public, donc GitHub Pages
publierait les données à tout le monde : écarté.

- **GitHub Actions** (gratuit, dépôt public) : cycle quotidien (collecte, prédictions) dans
  un conteneur PostgreSQL éphémère ; la base est restaurée puis sauvegardée à chaque
  exécution (stockage privé à choisir : cache GitHub Actions, ou Cloudflare R2).
  Les clés (Odds API, football-data.org) en secrets GitHub, jamais dans le dépôt.
- **Export statique** : l'API produit des fichiers JSON ; le tableau de bord les lit.
- **Cloudflare Pages** : publication du site (lien gratuit `*.pages.dev`), envoyé par
  l'action GitHub (les données ne sont jamais commitées dans le dépôt public).
- **Cloudflare Access** (gratuit jusqu'à 50 utilisateurs) : connexion par code e-mail ;
  seules les adresses ajoutées par le propriétaire entrent = approbation du super admin.
- Version 1 en lecture seule ; pronostics par utilisateur en étape 2 (Workers + D1).
- À vérifier : carte bancaire demandée pour Access/R2 ; blocage éventuel de OneFootball
  depuis les adresses GitHub ; nom `benkassiyfootball.pages.dev` libre.

## 10. Révision après vérification des connecteurs (2026-10-29) — remplace la section 9

Connecteurs claude.ai du propriétaire : **Vercel**, **Netlify**, **Render** connectés ;
**Supabase** installé mais connexion à terminer. Choix, 0 € :

- **GitHub Actions** : cycle quotidien (collecte, modèle, prédictions) ; la base complète
  (~1,1 Go) reste côté GitHub (cache/artefact privé), jamais dans le dépôt public.
- **Supabase (gratuit)** : comptes (Supabase Auth), table `profiles` avec rôle
  (`superadmin`, `user`, `admin` prévu) et statut (`en_attente`, `actif`, `refusé`,
  `suspendu`) ; seules les **tables de résultats** (matchs à venir, probabilités, fiches,
  fiabilité : quelques Mo) y sont poussées chaque matin. Règles RLS : lecture réservée aux
  comptes `actif` ; validation par le super admin.
- **Vercel (gratuit)** : site (lien `*.vercel.app`, domaine plus tard), pages : connexion,
  demande de compte (code d'invitation obligatoire), page super admin (approuver/refuser).
- Écartés : Render gratuit (Postgres gratuit supprimé après 30 jours, limité à 1 Go ;
  tâches planifiées payantes), Cloudflare (pas de connecteur ; reste une alternative).
- À faire par le propriétaire : terminer la connexion du connecteur Supabase dans les
  réglages claude.ai ; créer le projet Supabase (gratuit).
- Limites Supabase gratuit à surveiller : 500 Mo de base, projet mis en pause après une
  semaine sans activité (l'envoi quotidien l'évite).

## 11. Mise en œuvre (2026-10-29)

- Projet Supabase `benkassiyfootball` (offre gratuite, région eu-central-1), schéma
  `supabase/migrations/0001_site_accounts.sql` appliqué. Testé en SQL : sans code
  d'invitation, inscription refusée ; code valide, compte `en_attente` sans accès aux
  données ; code déjà utilisé, refusé ; e-mail du super admin, compte actif ; seul le
  super admin approuve et crée des codes ; un visiteur anonyme ne lit rien.
- Données : table `snapshots` (une ligne par réponse de `/api/dash`), écrite par
  `footintel export-supabase` ; les lignes non rafraîchies sont supprimées.
- Site : `web/` (voir `web/README.md`), tableau de bord existant + couche Supabase.
- Cycle : `.github/workflows/util-football-intel-daily.yml` ; base complète chiffrée dans
  le cache GitHub Actions (clé `FOOTINTEL_STATE_KEY`), jamais dans le dépôt.
- Réglages restant au propriétaire : `web/README.md`, section « One-time setup ».
