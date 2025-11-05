#!/bin/bash
# Fix: Move branch from wrong repo to correct repo

echo "=== Fixing Git Remote Configuration ==="

# Step 1: Check current remote
echo "Current remote:"
git remote -v

# Step 2: Add your fork as a new remote (if not already origin)
echo ""
echo "Adding your fork as 'myfork' remote..."
git remote add myfork https://github.com/AI-IAN/n8n.git 2>/dev/null || echo "Remote 'myfork' already exists"

# Step 3: Push to your fork
echo ""
echo "Pushing to your fork..."
git push -u myfork claude/update-for-latest-claude-011CUq3xo8JU7Sk6K6dkShN9

# Step 4: Update origin to point to your fork
echo ""
echo "Updating origin to point to your fork..."
git remote set-url origin https://github.com/AI-IAN/n8n.git

echo ""
echo "✅ Done! Your branch is now on AI-IAN/n8n"
echo ""
echo "To delete from the wrong repo (if you have access):"
echo "1. Go to https://github.com/n8n-io/n8n/branches"
echo "2. Find: claude/update-for-latest-claude-011CUq3xo8JU7Sk6K6dkShN9"
echo "3. Click the trash icon to delete"
echo ""
echo "Or via command line:"
echo "git push https://github.com/n8n-io/n8n.git --delete claude/update-for-latest-claude-011CUq3xo8JU7Sk6K6dkShN9"
