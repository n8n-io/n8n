# NexyHub Branding - Git Workflow Guide

This guide explains how to maintain your NexyHub-branded fork of n8n while keeping it in sync with upstream changes.

## 📋 Repository Structure

```
NexyHub/n8n (your fork)
├── master              # Tracks upstream n8n/n8n
└── nexyhub-branding    # Your custom branding (current branch)
```

## 🔄 Initial Setup (Already Done)

The initial setup has been completed with the following structure:

```bash
# Created branch
git checkout -b nexyhub-branding

# Added branding files
packages/frontend/@n8n/design-system/src/css/
├── _tokens.scss (modified - 1 import line added)
└── themes/nexyhub/
    ├── _nexyhub-primitives.scss (new)
    ├── _nexyhub-overrides.scss (new)
    └── README.md (new)

# Committed changes
git commit -m "feat: Add NexyHub branding theme"
```

## 🚀 Deployment Workflow

### 1. Build and Test Locally

```bash
# Make sure you're on the branding branch
git checkout nexyhub-branding

# Install dependencies (if needed)
pnpm install

# Build the design system
cd packages/frontend/@n8n/design-system
pnpm build

# Check for errors
echo $?  # Should output 0 for success

# Optional: View in Storybook
pnpm storybook

# Build the full application
cd /Users/runner/Documents/n8n
pnpm build > build.log 2>&1

# Check build results
tail -n 50 build.log
```

### 2. Build Docker Image

```bash
# From repository root
cd /Users/runner/Documents/n8n

# Build Docker image with NexyHub branding
pnpm dockerize-n8n

# Or manually:
docker build -t nexyhub/n8n:latest -f docker/images/n8n/Dockerfile .

# Tag for your registry
docker tag nexyhub/n8n:latest your-registry.com/nexyhub/n8n:latest

# Push to your registry
docker push your-registry.com/nexyhub/n8n:latest
```

### 3. Test Docker Image

```bash
# Run locally to test
docker run -it --rm \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=admin \
  nexyhub/n8n:latest

# Open browser to http://localhost:5678
# Verify NexyHub colors are applied
```

## 🔄 Keeping Up-to-Date with n8n Upstream

### One-Time Setup: Add Upstream Remote

```bash
# Add n8n's official repo as upstream (if not already done)
git remote add upstream https://github.com/n8n-io/n8n.git

# Verify remotes
git remote -v
# origin    https://github.com/NexyHub/n8n.git (your fork)
# upstream  https://github.com/n8n-io/n8n.git (n8n official)
```

### Regular Update Workflow (Weekly/Monthly)

```bash
# Step 1: Update master from upstream
git checkout master
git fetch upstream
git merge upstream/master
# or: git pull upstream master

# Step 2: Push updated master to your fork
git push origin master

# Step 3: Rebase your branding branch
git checkout nexyhub-branding
git rebase master

# If conflicts occur (rare), resolve them:
# - Edit conflicted files
# - git add <resolved-files>
# - git rebase --continue

# Step 4: Force push updated branding branch
git push origin nexyhub-branding --force-with-lease

# Step 5: Test the merged changes
pnpm build
```

## 🛠️ Handling Merge Conflicts

### Most Likely Conflict: `_tokens.scss`

If n8n modifies `_tokens.scss`, you'll need to re-apply your import line:

```bash
# During rebase, if _tokens.scss conflicts:
git status  # Shows conflicted file

# Open the file and look for conflict markers:
# <<<<<<< HEAD (their changes)
# ...
# =======
# ... (your changes)
# >>>>>>> nexyhub-branding

# Resolution strategy:
# 1. Keep n8n's changes
# 2. Ensure your import line is at the top:
#    @use './themes/nexyhub/nexyhub-overrides' as nexyhub;
# 3. Ensure your mixin call is at the BOTTOM of the theme mixin:
#    @include nexyhub.nexyhub-theme;

# Mark as resolved
git add packages/frontend/@n8n/design-system/src/css/_tokens.scss
git rebase --continue
```

### Conflict Prevention Tips

1. **Only modify these files:**
   - `_tokens.scss` (1 import line at top, 1 mixin call at bottom)
   - Files in `themes/nexyhub/` directory

2. **Never modify:**
   - `_primitives.scss`
   - `_tokens.dark.scss`
   - Any other n8n core files

3. **If you need to customize more:**
   - Add overrides to `_nexyhub-overrides.scss`
   - Don't edit n8n's original files directly

## 🎨 Updating NexyHub Colors

### Scenario: NexyHub brand colors changed

```bash
# Make sure you're on the branding branch
git checkout nexyhub-branding

# Edit the primitive colors
nano packages/frontend/@n8n/design-system/src/css/themes/nexyhub/_nexyhub-primitives.scss

# Change the hex values:
--nh--primary-500: #NEW_COLOR;
--nh--accent-500: #NEW_COLOR;

# Rebuild and test
pnpm build

# Commit the change
git add packages/frontend/@n8n/design-system/src/css/themes/nexyhub/_nexyhub-primitives.scss
git commit -m "chore: Update NexyHub brand colors"
git push origin nexyhub-branding
```

## 🏷️ Versioning Strategy

### Option 1: Tag Your Releases

```bash
# After successful build and testing
git tag -a nexyhub-v1.0.0 -m "NexyHub branding v1.0.0 based on n8n v1.x.x"
git push origin nexyhub-v1.0.0

# Docker image tagging
docker tag nexyhub/n8n:latest nexyhub/n8n:nexyhub-v1.0.0
docker push nexyhub/n8n:nexyhub-v1.0.0
```

### Option 2: Use n8n's Version + Branding Suffix

```bash
# Check n8n version
cat package.json | grep version

# Tag with n8n version + suffix
git tag -a v1.25.0-nexyhub -m "Based on n8n v1.25.0 with NexyHub branding"
docker tag nexyhub/n8n:latest nexyhub/n8n:1.25.0-nexyhub
```

## 🔧 Automated Update Script

Create a script to automate updates:

```bash
#!/bin/bash
# File: scripts/update-from-upstream.sh

set -e

echo "🔄 Updating from n8n upstream..."

# Update master
git checkout master
git fetch upstream
git merge upstream/master
git push origin master

# Update branding branch
git checkout nexyhub-branding
git rebase master
git push origin nexyhub-branding --force-with-lease

# Build and test
echo "🔨 Building with NexyHub branding..."
pnpm build > build.log 2>&1

# Check for build errors
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📊 Last 20 lines of build log:"
    tail -n 20 build.log
else
    echo "❌ Build failed. Check build.log for details."
    exit 1
fi

echo "✅ Update complete!"
```

Make it executable:
```bash
chmod +x scripts/update-from-upstream.sh
```

## 📊 Branch Comparison

View differences between branches:

```bash
# See what's different in your branding
git diff master..nexyhub-branding

# See only file names that changed
git diff master..nexyhub-branding --name-only

# Should show:
# packages/frontend/@n8n/design-system/src/css/_tokens.scss
# packages/frontend/@n8n/design-system/src/css/themes/nexyhub/_nexyhub-primitives.scss
# packages/frontend/@n8n/design-system/src/css/themes/nexyhub/_nexyhub-overrides.scss
# packages/frontend/@n8n/design-system/src/css/themes/nexyhub/README.md
```

## 🐛 Troubleshooting

### Build fails after rebase

```bash
# Clean and reinstall
rm -rf node_modules
pnpm install

# Clean build cache
pnpm clean  # if available
pnpm build
```

### Colors not appearing in Docker

```bash
# Ensure CSS is compiled in Docker image
docker build --no-cache -t nexyhub/n8n:latest .

# Check if files exist in image
docker run --rm nexyhub/n8n:latest ls -la /usr/local/lib/node_modules/n8n/node_modules/@n8n/design-system/dist
```

### Rebase conflicts are confusing

```bash
# Abort and try merge instead
git rebase --abort

# Use merge strategy
git checkout nexyhub-branding
git merge master

# Resolve conflicts, then:
git add .
git commit -m "chore: Merge upstream changes"
git push origin nexyhub-branding
```

## 📅 Recommended Update Schedule

- **Weekly**: Check for upstream updates, apply if minor changes
- **Monthly**: Full update, rebuild, and test cycle
- **Major n8n releases**: Test thoroughly before deploying
- **Security patches**: Apply immediately

## 🔐 Security Considerations

1. **Keep credentials separate**: Never commit secrets
2. **Review upstream changes**: Check CHANGELOG.md for breaking changes
3. **Test before production**: Always test Docker image before deploying
4. **Monitor n8n releases**: Subscribe to n8n's release notifications

## 📚 Additional Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n GitHub Releases](https://github.com/n8n-io/n8n/releases)
- [NexyHub Theme README](./packages/frontend/@n8n/design-system/src/css/themes/nexyhub/README.md)

## ✅ Checklist: Before Each Deployment

- [ ] Updated from upstream
- [ ] Resolved any conflicts
- [ ] Ran `pnpm build` successfully
- [ ] Tested in Storybook
- [ ] Built Docker image
- [ ] Tested Docker image locally
- [ ] Verified NexyHub colors are applied
- [ ] Tagged release (if applicable)
- [ ] Pushed to container registry
- [ ] Updated deployment documentation

---

**Created**: October 29, 2025  
**Last Updated**: October 29, 2025  
**Maintained by**: NexyHub Development Team
