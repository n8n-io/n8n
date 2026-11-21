# Passation – 29/10/2026 – site Supabase + Vercel, marchés betPawa, rapport hebdomadaire

## Fait
- Supabase `benkassiyfootball` (ref mnwyipiakbleihdfpegg, eu-central-1, gratuit) : schéma
  `football-intel/supabase/migrations/0001_site_accounts.sql` (comptes sur invitation,
  approbation super admin, RLS). Super admin = benkaselekela418@gmail.com (private.settings).
- Site : https://benkassiyfootball.vercel.app (projet Vercel sans lien GitHub ; JS/CSS via
  jsDelivr épinglé + SRI ; procédure dans `football-intel/web/README.md`). Dernier code : 3af079f3.
- Export `footintel export-supabase` (table snapshots, 708 pages, 15 Mo) ; workflow
  `.github/workflows/util-football-intel-daily.yml` (état chiffré dans le cache Actions).
- D58 marchés betPawa (1UP, 2UP, premier but, DC, 12) ; D59 onglet Moments du match, duos,
  profil mi-temps non reproductible (r = 0,045) ; D60 rapport d'erreurs + PDF par SMTP.
- Premier rapport envoyé par Gmail à benkaselekela418@gmail.com ; rappel Calendar lundi 8 h.
- Tests : 54 unitaires, 22 d'intégration ; site testé dans un navigateur (local et en ligne).

## Non vérifié
- `push()` de l'export vers Supabase réel (pas de clé secrète dans la session).
- Le workflow GitHub n'a jamais tourné (secrets absents, branche non fusionnée dans master).
- Envoi SMTP (pas de mot de passe d'application).

## En attente (propriétaire)
- Supabase : Site URL + Redirect URLs (web/README.md étape 1), clé secrète.
- GitHub : secrets SUPABASE_SECRET_KEY, FOOTINTEL_STATE_KEY, SMTP_* ; fusion dans master.
- Supprimer les 2 comptes de test neutralisés (e2e-*@example.com) depuis le tableau de bord.
- Proxy Sofascore (passes clés, tirs par joueur).

## Prochaine étape
Après les secrets : lancer le workflow à la main, vérifier l'export et l'e-mail du lundi.
