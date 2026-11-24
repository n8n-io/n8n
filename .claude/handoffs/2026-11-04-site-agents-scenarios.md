# Passation — 4 novembre 2026 : site autonome, scénarios, refonte, analystes IA

## Objectif

Le propriétaire voulait un site qui tourne sans Claude, un modèle qui apprend des scénarios,
un site plus clair et sécurisé, et des agents IA pour l'entretenir.

## Fait (PR #27 à #39, toutes fusionnées dans master ; site Vercel à jour)

- **Actions GitHub réactivées** sur le fork (bouton de l'onglet Actions). Runs #14 et #16 verts.
- **D70** — l'état chiffré est aussi sauvegardé 90 jours comme artefact, avec reprise si le
  cache manque ; le run planifié réactive son workflow (règle des 60 jours).
  `.github/workflows/util-football-intel-daily.yml`.
- **D71** — Tickets du jour par courriel chaque matin (`footintel email-tickets`,
  `notify/tickets.py`). Le compte d'envoi fonctionne : le rapport hebdomadaire est bien parti.
- **D72–D73** — les scénarios ajustent le 1X2 du marché (`analysis/scenario_adjust.py`) :
  poids communs + poids par grand championnat (pénalité 1 000). Contrôle chaque lundi sur 5
  saisons ; un championnat qui ne bat pas le marché est coupé (Ligue 1 coupée au 04/11).
  Poids appris par `footintel scenario-weights` au premier cycle, puis chaque lundi.
- **D74–D75** — scénarios combinés : aucun apport. Rotation : pas testable (environ 300 matchs
  avec compositions). Scénarios du propriétaire testés : « favori après l'Europe » rejeté ;
  « petit à domicile après une défaite » fait moins bien que prévu, gardé en observation.
- **D76** — site en 4 onglets : Aujourd'hui (accueil), Matchs, Vérifier une cote, Bilan.
  Barre d'onglets en bas sur téléphone. Lignes de match en clair. Tickets limités aux équipes
  du propriétaire, toutes compétitions. Bilan (`/bilan`, `analysis/bilan.py`) :
  `footintel archive-tickets` archive chaque matin, puis règle avec les scores et l'ordre des
  buts. Sécurité : CSP (préfixe `cdn.jsdelivr.net/gh/benkas418-alt/`), SRI, HSTS,
  Permissions-Policy, COOP, fin de session après 14 jours.
- **Vérificateur de cotes refait** : recherche, « Mes équipes » par défaut, verdicts en mots,
  combiné replié.
- **D77** — Lecture du jour par compétition, écrite par Claude Haiku 5.5
  (`agents/analysts.py`, `footintel write-lectures`, `/lecture`). Un texte avec un chiffre
  absent des données est rejeté. En veille tant que `ANTHROPIC_API_KEY` manque.
- Compétence `ui-ux-pro-max` installée ; 9 dépôts évalués (verdicts dans `.claude/CLAUDE.md`).

## Décisions

D70 à D77 dans `football-intel/docs/DECISIONS.md`. Résultats chiffrés dans `docs/RESULTS.md`.

## Vérifié / non vérifié

- Vérifié : 66 tests unitaires ; captures 390 px et 1440 px des 4 pages ; CSP testée dans
  Chromium, en local puis en ligne (aucune violation) ; site en ligne identique au build.
- Non vérifié : les pages une fois connecté sur le vrai site (aucun compte de test) ; le premier
  run planifié avec les nouvelles étapes (sauvegarde, réactivation, archivage, scenario-weights,
  courriel des tickets) a lieu le 05/11 à 05:23, heure de Lubumbashi.

## Écarté

- Tâche planifiée Claude Code « gardien » : refusée par le propriétaire, ne pas la recréer.
- Oubli des vieilles saisons pour les scénarios (D73) et scénarios combinés (D74) : moins bons.
- Dépôts non installés : voir le tableau de `.claude/CLAUDE.md`.

## En attente (propriétaire)

- Ajouter le secret GitHub `ANTHROPIC_API_KEY` (console.anthropic.com, avec un plafond
  mensuel) pour démarrer la Lecture du jour.
- Activer « Leaked password protection » dans Supabase (Authentication), si son offre le permet.
- Activer les courriels d'échec des Actions : https://github.com/settings/notifications.
- Ouvrir le site connecté sur téléphone et signaler toute page bloquée sur « Chargement… ».

## Prochaine étape

Vérifier le run du 05/11 (05:23, heure de Lubumbashi) : étapes vertes, artefact
`footintel-state` créé, `scenario_weights.json` appris, tickets archivés, courriel des tickets
reçu, `/bilan` et `/tickets` à jour dans Supabase.
