# Catalogue des nœuds n8n

Types et versions vérifiés dans le code source de n8n et dans ses workflows de test. Ces versions ne sont pas toujours les plus récentes : ce sont des versions stables, largement utilisées, que toute version récente de n8n sait charger. n8n garde la compatibilité avec les anciennes versions de nœuds, donc une version stable s'importe partout, alors qu'une version trop récente casse sur une installation un peu ancienne.

## Sommaire
- Structure d'un fichier workflow
- Déclencheurs
- Agent IA et sous-nœuds (modèle, mémoire, outils)
- Nœuds d'action
- Expressions utiles

## Structure d'un fichier workflow

```json
{
  "name": "Nom du workflow",
  "nodes": [ /* liste des nœuds */ ],
  "connections": { /* voir ci-dessous */ },
  "settings": { "executionOrder": "v1" },
  "pinData": {}
}
```

Chaque nœud :

```json
{
  "parameters": { },
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [440, 0],
  "id": "un-uuid-unique",
  "name": "Nom unique"
}
```

Connexions, indexées par le nom du nœud source :

```json
"connections": {
  "Telegram Trigger": { "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]] },
  "Claude":           { "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]] },
  "Mémoire":          { "ai_memory":        [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]] },
  "Wikipedia":        { "ai_tool":          [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] }
}
```

Pour un nœud IF, `main` contient deux listes : la première pour « vrai », la seconde pour « faux ».

Les nœuds avec déclencheur web (webhook, Telegram, chat) ont aussi un champ `"webhookId"` : mets un UUID.

## Déclencheurs

| Usage | Type | Version | Paramètres |
|---|---|---|---|
| Lancement manuel | `n8n-nodes-base.manualTrigger` | 1 | `{}` |
| Chat intégré n8n | `@n8n/n8n-nodes-langchain.chatTrigger` | 1.1 | `{ "options": {} }` ; le message arrive dans `$json.chatInput`, la session dans `$json.sessionId` |
| Message Telegram | `n8n-nodes-base.telegramTrigger` | 1.2 | `{ "updates": ["message"], "additionalFields": {} }` ; texte : `$json.message.text`, chat : `$json.message.chat.id` ; identifiant `telegramApi` |
| Heure fixe | `n8n-nodes-base.scheduleTrigger` | 1.2 | tous les jours à 8 h : `{ "rule": { "interval": [{ "triggerAtHour": 8 }] } }` ; cron : `{ "rule": { "interval": [{ "field": "cronExpression", "expression": "0 8 * * 1-5" }] } }` |
| Appel web | `n8n-nodes-base.webhook` | 2 | `{ "httpMethod": "POST", "path": "mon-chemin", "responseMode": "responseNode", "options": {} }` ; à combiner avec Respond to Webhook |

## Agent IA et sous-nœuds

### AI Agent

Type `@n8n/n8n-nodes-langchain.agent`, version `2.2`.

Après un déclencheur de chat n8n, l'agent lit `chatInput` tout seul :

```json
{ "options": { "systemMessage": "Tu es …" } }
```

Après tout autre déclencheur, précise le texte à traiter :

```json
{
  "promptType": "define",
  "text": "={{ $json.message.text }}",
  "options": { "systemMessage": "Tu es …" }
}
```

La réponse de l'agent est dans `$json.output`.

### Modèles de langage (connexion `ai_languageModel`)

| Fournisseur | Type | Version | Paramètres | Identifiant |
|---|---|---|---|---|
| Anthropic Claude | `@n8n/n8n-nodes-langchain.lmChatAnthropic` | 1.3 | `{ "model": { "__rl": true, "mode": "id", "value": "claude-sonnet-5-5" }, "options": {} }` | `anthropicApi` |
| OpenAI | `@n8n/n8n-nodes-langchain.lmChatOpenAi` | 1.2 | `{ "model": { "__rl": true, "mode": "id", "value": "<id du modèle>" }, "options": {} }` | `openAiApi` |
| Google Gemini | `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` | 1 | `{ "modelName": "<id du modèle>", "options": {} }` | `googlePalmApi` |

Modèles Claude courants : `claude-sonnet-5-5` (équilibré, par défaut), `claude-haiku-5-5` (rapide et économique), `claude-opus-5-5` (le plus capable). Si le modèle n'est pas reconnu après l'import, l'utilisateur le choisit dans la liste du nœud.

### Mémoire (connexion `ai_memory`)

Type `@n8n/n8n-nodes-langchain.memoryBufferWindow`, version `1.3`.

- Avec le chat n8n : `{ "contextWindowLength": 10 }` (la session vient du déclencheur).
- Avec Telegram ou un autre déclencheur, une mémoire par conversation :
  `{ "sessionIdType": "customKey", "sessionKey": "={{ $('Telegram Trigger').item.json.message.chat.id }}", "contextWindowLength": 10 }`

Cette mémoire est perdue au redémarrage de n8n. Pour une mémoire durable, il faut une base de données (Postgres Chat Memory) : signale-le comme amélioration possible.

### Outils de l'agent (connexion `ai_tool`)

| Outil | Type | Version | Paramètres |
|---|---|---|---|
| Réfléchir (raisonnement pas à pas) | `@n8n/n8n-nodes-langchain.toolThink` | 1 | `{}` |
| Calculatrice | `@n8n/n8n-nodes-langchain.toolCalculator` | 1 | `{}` |
| Wikipédia | `@n8n/n8n-nodes-langchain.toolWikipedia` | 1 | `{}` |
| Appel d'API | `n8n-nodes-base.httpRequestTool` | 4.2 | `{ "toolDescription": "…", "url": "https://…", "options": {} }` ; ajouter `"method": "POST"`, `"sendBody": true`, etc. si besoin |
| Lancer un autre workflow | `@n8n/n8n-nodes-langchain.toolWorkflow` | 2.2 | `{ "description": "…", "workflowId": { "__rl": true, "mode": "id", "value": "<id>" } }` |
| Google Sheets | `n8n-nodes-base.googleSheetsTool` | 4.5 | voir Google Sheets plus bas, avec `"descriptionType": "manual", "toolDescription": "…"` |
| Gmail | `n8n-nodes-base.gmailTool` | 2.1 | voir Gmail plus bas, avec `"descriptionType": "manual", "toolDescription": "…"` |

Pour qu'un champ d'outil soit rempli par l'IA : `"={{ $fromAI('to', 'Adresse e-mail du destinataire', 'string') }}"`.

Outil Google Sheets qui ajoute une ligne remplie par l'IA. Le mode `autoMapInputData` ne marche pas pour un outil : décris chaque colonne avec `defineBelow`.

```json
{
  "descriptionType": "manual",
  "toolDescription": "Enregistre une commande confirmée par le client.",
  "operation": "append",
  "documentId": { "__rl": true, "mode": "url", "value": "<URL de la feuille>" },
  "sheetName": { "__rl": true, "mode": "name", "value": "Commandes" },
  "columns": {
    "mappingMode": "defineBelow",
    "value": {
      "Client": "={{ $fromAI('client', 'Nom du client', 'string') }}",
      "Date": "={{ $now.format('yyyy-MM-dd HH:mm') }}"
    },
    "matchingColumns": [],
    "schema": [
      { "id": "Client", "displayName": "Client", "required": false, "defaultMatch": false, "display": true, "type": "string", "canBeUsedToMatch": true },
      { "id": "Date", "displayName": "Date", "required": false, "defaultMatch": false, "display": true, "type": "string", "canBeUsedToMatch": true }
    ]
  },
  "options": {}
}
```

Les noms de colonnes doivent correspondre exactement à la première ligne de la feuille. Dis à l'utilisateur de créer cette ligne d'en-tête avant le test.

## Nœuds d'action

| Usage | Type | Version | Paramètres |
|---|---|---|---|
| Envoyer un message Telegram | `n8n-nodes-base.telegram` | 1.2 | `{ "chatId": "={{ $('Telegram Trigger').item.json.message.chat.id }}", "text": "={{ $json.output }}", "additionalFields": { "appendAttribution": false } }` |
| Requête HTTP | `n8n-nodes-base.httpRequest` | 4.2 | `{ "url": "https://…", "options": {} }` (GET par défaut) |
| Définir des champs | `n8n-nodes-base.set` | 3.4 | `{ "assignments": { "assignments": [ { "id": "<uuid>", "name": "champ", "value": "={{ … }}", "type": "string" } ] }, "options": {} }` |
| Condition | `n8n-nodes-base.if` | 2.2 | `{ "conditions": { "options": { "caseSensitive": true, "typeValidation": "strict", "version": 2 }, "conditions": [ { "id": "<uuid>", "leftValue": "={{ $json.x }}", "rightValue": "oui", "operator": { "type": "string", "operation": "equals" } } ], "combinator": "and" }, "options": {} }` |
| Code JavaScript | `n8n-nodes-base.code` | 2 | `{ "jsCode": "return items;" }` |
| Répondre à un webhook | `n8n-nodes-base.respondToWebhook` | 1.4 | `{ "respondWith": "json", "responseBody": "={{ { reponse: $json.output } }}", "options": {} }` |
| Envoyer un e-mail Gmail | `n8n-nodes-base.gmail` | 2.1 | `{ "sendTo": "a@b.com", "subject": "…", "message": "…", "options": {} }` (opération « send » par défaut) ; identifiant `gmailOAuth2` |
| Ajouter une ligne Google Sheets | `n8n-nodes-base.googleSheets` | 4.5 | `{ "operation": "append", "documentId": { "__rl": true, "mode": "url", "value": "<URL de la feuille>" }, "sheetName": { "__rl": true, "mode": "name", "value": "Feuille1" }, "columns": { "mappingMode": "autoMapInputData", "value": {} }, "options": {} }` ; identifiant `googleSheetsOAuth2Api` |
| Lire des lignes Google Sheets | `n8n-nodes-base.googleSheets` | 4.5 | mêmes `documentId` et `sheetName`, sans `operation` (lecture par défaut) |

Pour tout service absent de ce catalogue, utilise HTTP Request vers son API et indique à l'utilisateur la documentation à consulter.

## Expressions utiles

- Valeur du nœud précédent : `={{ $json.champ }}`
- Valeur d'un nœud précis : `={{ $('Nom du nœud').item.json.champ }}`
- Date du jour : `={{ $now.format('yyyy-MM-dd') }}`
- Une expression commence toujours par `=` dans le JSON.
