# Guide de Build d'Images Docker pour le Développement

Ce guide explique comment construire et utiliser des images Docker personnalisées pour le développement n8n.

## Architecture du Build

```
Code Source → pnpm build:n8n → /compiled → Dockerfile → Docker Image → GHCR
```

### Composants

1. **Build TypeScript** : `pnpm build:n8n` compile le code et crée le répertoire `/compiled`
2. **Dockerfile** : `docker/images/n8n/Dockerfile` crée l'image à partir de `/compiled`
3. **GitHub Actions** : `.github/workflows/docker-build-dev.yml` automatise le processus
4. **GHCR** : GitHub Container Registry stocke les images

---

## Méthode 1 : Via GitHub Actions (Recommandé)

### Avantages
- ✅ Build dans le cloud (pas de ressources locales utilisées)
- ✅ Cache optimisé pour des builds plus rapides
- ✅ Image accessible depuis n'importe quelle machine
- ✅ Partage facile avec l'équipe

### Prérequis

```bash
# Installer GitHub CLI si nécessaire
brew install gh

# S'authentifier
gh auth login
```

### Utilisation

**Option A : Script Helper (Le plus simple)**

```bash
./scripts/build-dev-image.sh
```

Le script va :
1. Détecter votre branche actuelle
2. Demander confirmation
3. Déclencher le workflow GitHub Actions
4. Afficher les commandes pour utiliser l'image

**Option B : Commande Manuelle**

```bash
# Déclencher le build pour la branche actuelle
gh workflow run docker-build-dev.yml

# Déclencher le build pour une branche spécifique
gh workflow run docker-build-dev.yml \
  --ref feature/ma-feature \
  -f branch=feature/ma-feature

# Surveiller la progression
gh run watch

# Lister les builds récents
gh run list --workflow=docker-build-dev.yml
```

**Option C : Via l'Interface Web**

1. Allez sur : https://github.com/VOTRE_ORG/n8n/actions
2. Sélectionnez le workflow "Docker: Build Dev Image"
3. Cliquez sur "Run workflow"
4. Choisissez la branche et lancez

### Vérifier le Build

```bash
# Voir les logs en temps réel
gh run watch

# Voir la liste des runs
gh run list --workflow=docker-build-dev.yml --limit 5

# Voir les détails d'un run spécifique
gh run view <RUN_ID>
```

### Utiliser l'Image Buildée

Une fois le build terminé :

```bash
# 1. Configurer .env
cat > .env << EOF
GITHUB_REPOSITORY_OWNER=kodflow
BRANCH_NAME=feature-dev-enterprise-mode
EOF

# 2. Pull l'image
docker compose -f docker-compose.dev.yml pull

# 3. Démarrer
docker compose -f docker-compose.dev.yml up -d
```

---

## Méthode 2 : Build Local

### Avantages
- ✅ Pas besoin d'attendre la CI
- ✅ Utile pour tester des changements rapidement
- ✅ Fonctionne offline

### Inconvénients
- ❌ Plus lent (15-20 minutes)
- ❌ Consomme des ressources CPU/RAM
- ❌ Nécessite beaucoup d'espace disque

### Prérequis

```bash
# Node.js 22.21.0
node --version

# pnpm
pnpm --version

# Docker avec Buildx
docker buildx version
```

### Processus Complet

```bash
# 1. Installer les dépendances
pnpm install --frozen-lockfile

# 2. Build l'application (crée /compiled)
pnpm build:n8n

# 3. Build l'image Docker
docker build \
  -f docker/images/n8n/Dockerfile \
  -t n8n-dev:local \
  --build-arg NODE_VERSION=22.21.0 \
  --build-arg N8N_VERSION=local-dev \
  --build-arg N8N_RELEASE_TYPE=dev \
  .

# 4. Tagger l'image (optionnel)
docker tag n8n-dev:local ghcr.io/kodflow/n8n:local

# 5. Utiliser dans docker-compose
# Modifier docker-compose.dev.yml :
#   image: n8n-dev:local
```

### Build Incrémental

Si vous modifiez souvent le code :

```bash
# Rebuild rapide (seulement ce qui a changé)
pnpm build:n8n && docker compose -f docker-compose.dev.yml up -d --build
```

---

## Méthode 3 : Utiliser le Workflow Existant

Le repo a déjà un workflow principal `.github/workflows/docker-build-push.yml` qui supporte les builds de branches.

### Déclencher un Build

```bash
# Via GitHub CLI
gh workflow run docker-build-push.yml \
  --ref feature/ma-feature

# L'image sera disponible à :
# ghcr.io/OWNER/n8n:branch-feature-ma-feature
```

---

## Gestion des Images

### Lister les Images Locales

```bash
docker images | grep n8n
```

### Pull une Image depuis GHCR

```bash
# Format général
docker pull ghcr.io/OWNER/n8n:TAG

# Exemples
docker pull ghcr.io/kodflow/n8n:branch-feature-dev-enterprise-mode
docker pull ghcr.io/kodflow/n8n:nightly
```

### Supprimer les Images Inutilisées

```bash
# Supprimer les images non utilisées
docker image prune -a

# Supprimer une image spécifique
docker rmi ghcr.io/kodflow/n8n:branch-old-feature
```

### Inspecter une Image

```bash
# Voir les métadonnées
docker inspect ghcr.io/kodflow/n8n:branch-feature-dev-enterprise-mode

# Voir les layers
docker history ghcr.io/kodflow/n8n:branch-feature-dev-enterprise-mode
```

---

## Troubleshooting

### Le Build GitHub Actions Échoue

**Problème : Erreur de build TypeScript**

```bash
# Vérifier localement
pnpm build:n8n
```

Si ça échoue localement, corrigez les erreurs avant de push.

**Problème : Timeout du workflow**

Le workflow a un timeout de 20 minutes. Si votre build prend plus de temps :
- Vérifiez que les caches GitHub Actions fonctionnent
- Contactez l'admin pour augmenter le timeout

### L'Image ne se Pull pas

**Erreur : Permission denied**

```bash
# S'authentifier à GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Ou via GitHub CLI
gh auth token | docker login ghcr.io -u USERNAME --password-stdin
```

**Erreur : Image not found**

Vérifiez que :
1. Le build a bien réussi : `gh run list --workflow=docker-build-dev.yml`
2. Le tag est correct : `ghcr.io/OWNER/n8n:branch-BRANCH_NAME`
3. L'image est publique ou vous êtes authentifié

### Le Container ne Démarre pas

```bash
# Voir les logs
docker compose -f docker-compose.dev.yml logs n8n

# Vérifier l'image
docker inspect ghcr.io/kodflow/n8n:branch-feature-dev-enterprise-mode

# Forcer un pull
docker compose -f docker-compose.dev.yml pull --ignore-pull-failures
docker compose -f docker-compose.dev.yml up -d --force-recreate
```

### Build Local Lent

**Optimisations :**

```bash
# 1. Utiliser BuildKit
export DOCKER_BUILDKIT=1

# 2. Utiliser le cache de build
docker build --cache-from ghcr.io/kodflow/n8n:nightly ...

# 3. Build multi-stage en parallèle
docker buildx build --load ...
```

---

## Variables d'Environnement pour le Build

### Dans GitHub Actions

```yaml
env:
  NODE_OPTIONS: '--max-old-space-size=7168'  # Mémoire pour Node.js
  NODE_VERSION: '22.21.0'                     # Version Node.js
```

### Build Args du Dockerfile

```bash
--build-arg NODE_VERSION=22.21.0        # Version de Node.js
--build-arg N8N_VERSION=branch-XXX      # Tag de version n8n
--build-arg N8N_RELEASE_TYPE=dev        # Type de release
--build-arg TARGETPLATFORM=linux/amd64  # Plateforme cible
```

---

## Tags et Versioning

### Convention de Nommage

| Type | Format | Exemple |
|------|--------|---------|
| Branche | `branch-{nom-branche}` | `branch-feature-dev-enterprise-mode` |
| PR | `pr-{numéro}` | `pr-1234` |
| Nightly | `nightly` | `nightly` |
| Stable | `{version}` | `1.104.1` |
| Dev | `dev` | `dev` |
| Local | `local` ou custom | `local-dev`, `test-123` |

### Exemples d'URLs Complètes

```
ghcr.io/kodflow/n8n:branch-feature-dev-enterprise-mode
ghcr.io/kodflow/n8n:nightly
ghcr.io/kodflow/n8n:pr-1234
ghcr.io/n8n-io/n8n:1.104.1
```

---

## Workflows Disponibles

| Workflow | Fichier | Usage | Quand l'utiliser |
|----------|---------|-------|------------------|
| Docker Build Dev | `docker-build-dev.yml` | Build rapide pour dev | Développement quotidien |
| Docker Build Push | `docker-build-push.yml` | Build complet multi-arch | Releases, nightly |
| Docker Base Image | `docker-base-image.yml` | Build image de base | Rarement (mise à jour Node.js) |

---

## Intégration avec docker-compose.dev.yml

Le fichier `docker-compose.dev.yml` utilise des variables d'environnement :

```yaml
services:
  n8n:
    image: ghcr.io/${GITHUB_REPOSITORY_OWNER:-kodflow}/n8n:branch-${BRANCH_NAME:-feature-dev-enterprise-mode}
```

Valeurs par défaut si `.env` n'existe pas :
- `GITHUB_REPOSITORY_OWNER` = `kodflow`
- `BRANCH_NAME` = `feature-dev-enterprise-mode`

Pour changer :

```bash
# Créer .env
cat > .env << EOF
GITHUB_REPOSITORY_OWNER=votre-org
BRANCH_NAME=votre-branche
EOF
```

---

## Bonnes Pratiques

### Pour le Développement

1. **Utilisez GitHub Actions pour les builds** - Plus rapide et reproductible
2. **Ne committez jamais .env** - Contient des config spécifiques
3. **Utilisez des tags descriptifs** - `branch-feature-xyz` au lieu de `latest`
4. **Nettoyez régulièrement** - Supprimez les vieilles images

### Pour la CI/CD

1. **Activez les caches** - GitHub Actions cache automatiquement
2. **Utilisez des runners appropriés** - AMD64 pour dev, multi-arch pour prod
3. **Testez localement d'abord** - `pnpm build:n8n` avant de push
4. **Versionnez vos images** - Toujours tagger avec la branche/version

### Sécurité

1. **Images publiques** - Ne mettez pas de secrets dans les images
2. **Scannez les vulnérabilités** - Le workflow inclut Trivy scan
3. **Utilisez GHCR** - Meilleures permissions que Docker Hub
4. **Tokens GitHub** - Utilisez `GITHUB_TOKEN` auto-généré

---

## Ressources

- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [n8n Docker Docs](https://docs.n8n.io/hosting/installation/docker/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
