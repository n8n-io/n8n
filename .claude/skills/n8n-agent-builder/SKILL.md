---
name: n8n-agent-builder
description: Crée des agents IA et des workflows n8n simples, prêts à importer (fichier JSON), à partir d'une description en langage courant. Utilise ce skill dès que l'utilisateur veut créer, construire ou automatiser quelque chose avec n8n, un agent IA, un chatbot, un bot Telegram, un assistant personnel (« comme Jarvis »), une automatisation planifiée, un webhook ou un enchaînement d'outils (Gmail, Google Sheets, API HTTP), même s'il ne prononce pas le mot « n8n » ou « workflow ». Couvre aussi la modification d'un workflow n8n existant fourni en JSON.
---

# Créateur d'agents IA et de workflows n8n

Ce skill transforme une demande comme « je veux un bot Telegram qui répond à mes clients » en un fichier JSON que l'utilisateur importe dans n8n en un clic, avec un guide court pour le mettre en marche.

L'utilisateur type n'est pas développeur. Il veut un résultat qui fonctionne du premier coup, pas un cours sur n8n. Le plus grand risque est un JSON qui ne s'importe pas ou un nœud marqué « ? » dans l'éditeur : tout ce skill est construit pour l'éviter.

## Étape 1 : comprendre la demande

Il faut 3 informations pour construire un workflow :

1. **Le déclencheur** : qu'est-ce qui lance le workflow ? Un message (Telegram, chat n8n), une heure fixe, un appel web (webhook), un lancement manuel.
2. **Le travail** : que doit faire l'agent ou le workflow ? Quels outils utilise-t-il (Gmail, Google Sheets, une API, une recherche) ?
3. **La sortie** : où va le résultat ? Réponse dans le chat, message Telegram, ligne dans une feuille, e-mail.

Déduis ces informations de la demande et du contexte de la conversation. Pose des questions seulement pour ce qui manque vraiment, au maximum 3, en une seule fois. Si un choix a une valeur par défaut raisonnable, prends-la et dis-le dans la livraison au lieu de demander. Valeurs par défaut :

- Modèle d'IA : Anthropic Claude (`claude-sonnet-5-5`). Propose Haiku si l'usage est simple et fréquent, pour réduire le coût.
- Mémoire : oui pour tout agent conversationnel (10 derniers messages), non pour un traitement ponctuel.
- Langue de l'agent : la langue de l'utilisateur.
- Déclencheur d'un assistant personnel : Telegram, car c'est gratuit et rapide à configurer.

## Étape 2 : choisir la forme

Deux formes couvrent presque tous les besoins :

- **Agent IA** : l'IA décide quoi faire et utilise des outils. Pour les conversations, les questions ouvertes et les tâches qui varient. Structure : déclencheur → nœud AI Agent, avec des sous-nœuds branchés dessous (modèle, mémoire, outils) → sortie.
- **Workflow classique** : les étapes sont toujours les mêmes. Pour les tâches répétitives et prévisibles (rapport quotidien, copie de données). Une étape IA peut s'y insérer. Un workflow classique est moins cher et plus fiable qu'un agent : préfère-le quand l'IA n'a pas de vraie décision à prendre.

Pars du modèle le plus proche dans `assets/templates/` et adapte-le, au lieu d'écrire le JSON de zéro :

| Modèle | Usage |
|---|---|
| `agent-telegram.json` | Assistant ou bot Telegram avec mémoire par conversation |
| `agent-chat.json` | Agent testable directement dans le chat intégré de n8n, sans compte externe |
| `workflow-planifie.json` | Tâche à heure fixe : récupérer des données, résumer avec l'IA, envoyer le résultat |

## Étape 3 : construire le JSON

Lis `references/nodes.md` avant d'écrire un nœud. Il donne pour chaque nœud le type exact, la version et la forme des paramètres. N'invente pas de type de nœud ni de nom de paramètre : n8n affiche alors un nœud cassé. Si un besoin n'est couvert par aucun nœud du catalogue, utilise le nœud HTTP Request (ou l'outil HTTP Request pour un agent) vers l'API concernée, et signale-le.

Règles qui évitent les erreurs d'import :

- **Les connexions utilisent les noms des nœuds**, pas leurs `id`. Chaque nom doit être unique.
- **Les sous-nœuds se branchent à l'envers** : le modèle, la mémoire et les outils sont la *source* de la connexion, l'agent est la *cible*. Le type de connexion est `ai_languageModel`, `ai_memory` ou `ai_tool`, pas `main`.
- **Un agent a exactement un modèle** de langage branché.
- **Aucun secret dans le JSON.** Les clés API et les tokens vont dans les identifiants n8n (credentials). Dans le JSON, laisse le bloc `credentials` avec un nom lisible, par exemple `"Anthropic account"`, ou supprime-le : l'utilisateur choisira l'identifiant après l'import.
- **Positions** : place les nœuds principaux de gauche à droite (x = 0, 220, 440…) sur y = 0 ; les sous-nœuds sous l'agent (y = 220), espacés de 160 en x.
- **Prompt système de l'agent** : écris-le pour de vrai. Donne le rôle, le ton, ce que l'agent peut faire avec chaque outil et ce qu'il doit refuser ou transmettre à un humain. Un prompt vague donne un agent qui improvise. Ajoute la date courante avec `{{ $now.format('yyyy-MM-dd') }}` si l'agent gère des dates.
- **Un nœud s'exécute une fois par élément reçu.** Si une API renvoie une liste de 500 entrées, n8n crée 500 éléments, et le nœud IA suivant est appelé 500 fois, avec autant de factures. Avant une étape IA, limite les données (nœud Code ou paramètre de l'API) ou regroupe-les en un seul élément.
- **Outils de l'agent** : donne à chaque outil une description claire, car l'agent choisit ses outils à partir de leur description. Pour laisser l'IA remplir un champ, utilise `{{ $fromAI('nom', 'description', 'string') }}`.

## Étape 4 : valider

Enregistre le fichier, puis lance le validateur :

```bash
python3 <dossier-du-skill>/scripts/validate_workflow.py <fichier>.json
```

Il vérifie la structure, les connexions, les types de nœuds connus, le branchement des sous-nœuds et l'absence de secrets. Corrige toutes les erreurs et relance jusqu'à obtenir `OK`. Lis les avertissements : certains sont normaux (un nœud hors catalogue choisi volontairement), d'autres signalent un oubli.

## Étape 5 : livrer

Enregistre le JSON dans un fichier au nom explicite, par exemple `workflows/assistant-telegram.json`, puis donne une livraison courte avec exactement ces parties :

1. **Ce que fait le workflow**, en 2 ou 3 phrases.
2. **Import** : dans n8n, ouvre un nouveau workflow, puis menu « … » → « Import from File » (ou colle le JSON directement dans l'éditeur avec Ctrl+V).
3. **Identifiants à créer** : la liste des comptes à connecter (par exemple : clé API Anthropic, token du bot Telegram obtenu auprès de @BotFather), avec où les obtenir.
4. **Test** : comment l'essayer (envoyer un message au bot, bouton « Open chat », « Execute workflow ») et ce qui doit se passer.
5. **Activation** : pour qu'il tourne seul, l'activer avec l'interrupteur « Active ». Rappelle que n8n doit tourner en permanence (serveur ou n8n Cloud) pour les déclencheurs Telegram, webhook et planifiés.
6. **Choix faits par défaut** et **prochaine amélioration** utile, en une ligne chacun.

N'affiche pas le JSON entier dans la conversation s'il dépasse une cinquantaine de lignes : le fichier suffit.

## Modifier un workflow existant

Si l'utilisateur fournit un JSON n8n, garde les noms, les `id` et les identifiants des nœuds existants, modifie seulement ce qui est demandé, puis valide avec le script. Résume les changements nœud par nœud.

## Limites à dire honnêtement

- Le validateur vérifie la structure, pas le fonctionnement réel. Seul un test dans n8n le confirme.
- Les versions de nœuds du catalogue sont choisies pour s'importer dans les versions récentes de n8n. Si l'utilisateur a une très vieille version de n8n et qu'un nœud apparaît avec un « ? », il doit mettre à jour n8n.
- Les appels au modèle d'IA sont payants (facturés par le fournisseur selon l'usage). Ne donne pas de prix de mémoire : renvoie vers la page de tarifs du fournisseur.
