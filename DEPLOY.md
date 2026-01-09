# 🚀 Guide de Déploiement n8n sur Render.com avec Supabase

Ce guide explique comment déployer n8n sur Render.com en utilisant PostgreSQL de Supabase.

## 📋 Prérequis

- [ ] Compte GitHub avec ce repository forké
- [ ] Compte Render.com (gratuit pour commencer)
- [ ] Compte Supabase (gratuit pour commencer)
- [ ] Terminal avec OpenSSL (pour générer la clé de chiffrement)

## 🔧 Étape 1: Configuration Supabase

### 1.1 Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez les informations de connexion :
   - **Database Host** : `db.xxxxxxxxxxxxx.supabase.co`
   - **Database Port** : `5432`
   - **Database Name** : `postgres`
   - **User** : `postgres`
   - **Password** : (trouvez-le dans Settings > Database > Database Password)

### 1.2 Vérifier SSL

1. Dans Supabase, allez à **Settings** > **Database**
2. Confirmez que SSL est activé (par défaut)
3. **Important** : Supabase utilise SSL, mais n8n nécessite `SSL_REJECT_UNAUTHORIZED=false`

## 🔐 Étape 2: Générer la clé de chiffrement

**⚠️ CRITIQUE** : Cette clé chiffre toutes vos credentials. Si vous la perdez, vous perdez vos données !

```bash
# Générer une clé aléatoire sécurisée de 32 caractères
openssl rand -hex 32
```

**Exemple de sortie :**
```
3f9a2b7c1d8e4f5a6b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a
```

**⚠️ SAUVEGARDEZ CETTE CLÉ** dans un gestionnaire de mots de passe !

## ☁️ Étape 3: Configuration Render.com

### 3.1 Créer le service web

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **New +** > **Blueprint**
3. Connectez votre repository GitHub
4. Sélectionnez le fichier `render.yaml` de ce repo

### 3.2 Configurer les variables d'environnement sensibles

Dans le Dashboard Render, allez à votre service > **Environment** et ajoutez :

#### Variables OBLIGATOIRES :

```bash
# Clé de chiffrement (générée à l'étape 2)
N8N_ENCRYPTION_KEY=votre_cle_generee_32_caracteres

# Connexion Supabase
DB_POSTGRESDB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_POSTGRESDB_PASSWORD=votre_mot_de_passe_supabase

# URL de votre app (remplacez par votre nom d'app Render)
N8N_HOST=votre-app-name.onrender.com
WEBHOOK_URL=https://votre-app-name.onrender.com/
```

### 3.3 Modifier render.yaml (optionnel)

Avant le déploiement, vous pouvez modifier `render.yaml` :

- **region** : `oregon` (US), `frankfurt` (EU), `singapore` (APAC)
- **plan** : `free`, `starter`, `standard`, etc.
- **GENERIC_TIMEZONE** : `Europe/Paris`, `America/New_York`, etc.

### 3.4 Déployer

1. Cliquez sur **Create Web Service**
2. Render va :
   - Cloner votre repo
   - Builder l'image Docker hardened
   - Démarrer n8n
   - Vérifier le health check

**⏱️ Temps de déploiement** : 5-10 minutes pour la première fois

## ✅ Étape 4: Vérification

### 4.1 Vérifier le déploiement

1. Allez sur `https://votre-app-name.onrender.com`
2. Vous devriez voir la page de création de compte n8n
3. Créez votre compte admin (premier utilisateur = admin)

### 4.2 Vérifier la connexion à la base de données

Dans les logs Render, vous devriez voir :

```
n8n ready on 0.0.0.0, port 5678
Version: x.x.x
```

Pas d'erreurs de connexion DB.

### 4.3 Tester un workflow simple

1. Créez un workflow avec un nœud Schedule
2. Exécutez-le manuellement
3. Vérifiez qu'il s'enregistre correctement

## 🔄 Synchronisation avec n8n upstream

Le repository se synchronise **automatiquement 2 fois par jour** avec le repo officiel n8n :

- **Minuit UTC** (01h CET / 02h CEST)
- **Midi UTC** (13h CET / 14h CEST)

Vous pouvez aussi déclencher manuellement :

1. Allez sur **Actions** dans GitHub
2. Sélectionnez **Sync Fork with Upstream n8n**
3. Cliquez sur **Run workflow**

## 🛡️ Sécurité

### Variables à JAMAIS committer :

- ❌ `N8N_ENCRYPTION_KEY`
- ❌ `DB_POSTGRESDB_PASSWORD`
- ❌ `DB_POSTGRESDB_HOST`
- ❌ Credentials d'API

### Bonnes pratiques :

- ✅ Activer 2FA sur Supabase et Render
- ✅ Utiliser des mots de passe forts
- ✅ Backup régulier de Supabase
- ✅ Exporter vos workflows régulièrement
- ✅ Surveiller les logs pour activité suspecte
- ✅ Limiter l'accès aux webhooks si possible

### Dockerfile Hardened

Ce déploiement utilise `Dockerfile.hardened` avec :

- ✅ Image Alpine minimale
- ✅ Utilisateur non-root
- ✅ Health checks
- ✅ Permissions strictes
- ✅ Pas de secrets dans l'image
- ✅ Scan de vulnérabilités compatible

## 📊 Plans Render recommandés

| Usage | Plan | Prix | Specs |
|-------|------|------|-------|
| Test / Dev | Free | $0 | Limité, sleep après inactivité |
| Petit projet | Starter | $7/mois | 512MB RAM, toujours actif |
| Production | Standard | $25/mois | 2GB RAM, scaling |

**Note** : Le plan gratuit met le service en veille après 15 min d'inactivité.

## 🔧 Dépannage

### Le service ne démarre pas

1. Vérifiez les logs Render
2. Assurez-vous que `N8N_ENCRYPTION_KEY` est défini
3. Vérifiez la connexion Supabase (host, password)

### Erreur de connexion DB

```
Error: connect ECONNREFUSED
```

**Solution** :
- Vérifiez `DB_POSTGRESDB_HOST` (sans `https://`)
- Confirmez que `DB_POSTGRESDB_SSL_ENABLED=true`
- Vérifiez que Supabase autorise les connexions

### Credentials perdus après redémarrage

**Cause** : `N8N_ENCRYPTION_KEY` a changé ou n'est pas défini

**Solution** :
- Utilisez TOUJOURS la même clé
- Définissez-la dans Render Environment Variables
- Sauvegardez-la en sécurité

### Service lent / timeout

**Causes possibles** :
- Plan gratuit Render (limité)
- Base de données Supabase saturée
- Trop de workflows actifs

**Solution** :
- Passez à un plan payant
- Optimisez vos workflows
- Augmentez `DB_POSTGRESDB_POOL_SIZE`

## 📚 Ressources

- [Documentation n8n](https://docs.n8n.io)
- [Documentation Render](https://render.com/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [n8n Community Forum](https://community.n8n.io)

## 🆘 Support

### Problèmes avec n8n :
- [Community Forum](https://community.n8n.io)
- [GitHub Issues](https://github.com/n8n-io/n8n/issues)

### Problèmes avec ce déploiement :
- Consultez les logs Render
- Vérifiez la configuration dans `render.yaml`
- Assurez-vous que toutes les variables d'environnement sont définies

## 📝 Checklist de déploiement

- [ ] Projet Supabase créé
- [ ] Informations de connexion Supabase notées
- [ ] Clé `N8N_ENCRYPTION_KEY` générée et sauvegardée
- [ ] Service Render créé depuis Blueprint
- [ ] Variables sensibles ajoutées dans Render Environment
- [ ] `render.yaml` modifié (nom d'app, région, etc.)
- [ ] Déploiement lancé
- [ ] Service accessible sur `https://votre-app.onrender.com`
- [ ] Compte admin n8n créé
- [ ] Workflow de test créé et exécuté
- [ ] Backup initial de Supabase effectué
- [ ] Documentation lue et comprise

## 🎉 Vous êtes prêt !

Votre instance n8n est maintenant déployée et sécurisée. Profitez de l'automatisation !
