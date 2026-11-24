# Passation – 29/10/2026 – football-intel, skills et outils

## Objectif
Améliorer football-intel (interface, modèle), évaluer et installer les dépôts envoyés par le
propriétaire, et rendre tout cela disponible dans chaque future session Claude Code.

## Fait
- Interface sombre « true-black-flat » + panneaux pliables (commit 7d4f9ee1).
- Mesure à la cote de clôture `footintel clv` + candidat mélange modèle-marché (c4e9389b, D54).
- Test xG Understat : pas de gain (af0734d4, D55).
- Décision Sofascore par connexion résidentielle (D56).
- 117 skills dans `.claude/skills` (85 ajoutées par nous, 38 venues de master) ; skills
  écrites par nous : ai-agent-engineering, claude-code-workflow, vercel-ai-sdk,
  activepieces-automation, football-data-sources, react-3d-web, cinematic-scroll-site,
  seedance-video, prediction-modeling, handoff-notes.
- Mémoire du projet : `.claude/CLAUDE.md` (statut de chaque dépôt envoyé, leçons).
- Script d'outils externes : `football-intel/scripts/claude-cloud-setup.sh`; version autonome
  collée par le propriétaire dans le « Setup script » de l'environnement.
- PR #3 vers master : https://github.com/benkas418-alt/n8n/pull/3 (master fusionné dans la
  branche, conflits résolus : 6 skills marketing gardées dans leur version master).

## Vérifié / non vérifié
- Tests football-intel : 68 passent.
- Session cloud neuve : setup script OK (soccerdata, Sofascore, free-claude-code installés) ;
  117 skills chargées ; `.claude/CLAUDE.md` lu.
- Les **plugins de projet ne se chargent pas** dans une session cloud neuve (ni n8n, ni
  session-handoff) : remplacé par la skill `handoff-notes` (notes dans le dépôt).

## Écarté
- super-token-saver (force la délégation à des sous-agents), MarketSync-EA (ordres au hasard),
  gpt6-Astra, claude-code-best, system_prompts_leaks (refusés). Transfermarkt (CGU
  interdisent robots et apprentissage automatique). Understat xG (pas de gain).

## En attente (propriétaire)
- Fusionner la PR #3 pour que `master` ait tout.
- Pour Sofascore : fournir un proxy résidentiel dans la variable d'environnement
  `SOFASCORE_CLIENT__PROXY` (ou faire tourner le scraper sur une connexion à domicile).
- Serveur (VPS) pour accéder à football-intel depuis l'extérieur : à discuter.

## Prochaine étape
Fusion de la PR #3, puis discussion du VPS et de la source d'absences (Sofascore via proxy,
ou ESPN après vérification de ses conditions).

## Ajout (fin de session) – site avec comptes
- Plan décidé : `football-intel/docs/DEPLOYMENT_PLAN.md` et décision D57.
- À implémenter dans la prochaine session : comptes (super admin + invités), sessions,
  invitations, rôles sur toutes les routes, pages de connexion et de gestion, tests,
  puis déploiement sur VPS avec le domaine `benkassiyfootball.com`.
- Choix final : GitHub Actions + Cloudflare Pages + Access (section 9 du plan). Le propriétaire crée un compte Cloudflare.
- Révision : GitHub Actions + Supabase + Vercel (section 10 du plan).
