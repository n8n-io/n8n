#!/bin/bash
# Comprehensive diagnostic script for Next.js + Cloudflare + Supabase apps
# Run from the project root (next-app/ directory)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       FULLSTACK DIAGNOSTIC TOOL            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# 1. Environment Check
echo -e "\n${YELLOW}=== Environment ===${NC}"
echo -n "Node: " && node -v 2>/dev/null || echo -e "${RED}NOT INSTALLED${NC}"
echo -n "npm: " && npm -v 2>/dev/null || echo -e "${RED}NOT INSTALLED${NC}"
echo -n "Wrangler: " && npx wrangler --version 2>/dev/null || echo -e "${YELLOW}Not installed (needed for Workers)${NC}"

# 2. Git Status
echo -e "\n${YELLOW}=== Git Status ===${NC}"
if [ -d .git ]; then
  git status --short
  echo "Branch: $(git branch --show-current)"
  echo "Last commit: $(git log -1 --oneline)"
else
  echo -e "${YELLOW}Not a git repository${NC}"
fi

# 3. Dependencies Check
echo -e "\n${YELLOW}=== Dependencies ===${NC}"
if [ -f package.json ]; then
  MISSING=$(npm ls --depth=0 2>&1 | grep -E "(UNMET|missing|ERR)" | head -10)
  if [ -z "$MISSING" ]; then
    echo -e "${GREEN}All dependencies OK${NC}"
  else
    echo -e "${RED}Missing dependencies:${NC}"
    echo "$MISSING"
  fi
else
  echo -e "${RED}No package.json found${NC}"
fi

# 4. TypeScript Check
echo -e "\n${YELLOW}=== TypeScript ===${NC}"
if [ -f tsconfig.json ]; then
  TS_ERRORS=$(npx tsc --noEmit 2>&1 | head -20)
  if [ -z "$TS_ERRORS" ]; then
    echo -e "${GREEN}No TypeScript errors${NC}"
  else
    echo -e "${RED}TypeScript errors:${NC}"
    echo "$TS_ERRORS"
  fi
else
  echo -e "${YELLOW}No tsconfig.json found${NC}"
fi

# 5. ESLint Check
echo -e "\n${YELLOW}=== ESLint ===${NC}"
LINT_ERRORS=$(npm run lint 2>&1 | tail -20)
if echo "$LINT_ERRORS" | grep -q "error"; then
  echo -e "${RED}Lint errors found:${NC}"
  echo "$LINT_ERRORS" | grep -E "(error|Error)" | head -10
else
  echo -e "${GREEN}No lint errors${NC}"
fi

# 6. Build Check
echo -e "\n${YELLOW}=== Build Test ===${NC}"
echo "Running build (this may take a moment)..."
BUILD_OUTPUT=$(npm run build 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "Export successful\|Compiled successfully\|Build completed"; then
  echo -e "${GREEN}Build successful${NC}"
else
  echo -e "${RED}Build failed:${NC}"
  echo "$BUILD_OUTPUT" | tail -30
fi

# 7. Environment Variables
echo -e "\n${YELLOW}=== Environment Variables ===${NC}"
if [ -f .env.local ]; then
  echo "Found .env.local with $(wc -l < .env.local | tr -d ' ') lines"
  grep -E "^NEXT_PUBLIC_" .env.local 2>/dev/null | sed 's/=.*/=***/' || true
else
  echo -e "${YELLOW}No .env.local file (using system env)${NC}"
fi

# Check required vars
for VAR in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
  if grep -q "$VAR" .env.local 2>/dev/null || [ -n "${!VAR}" ]; then
    echo -e "${GREEN}$VAR: Set${NC}"
  else
    echo -e "${RED}$VAR: Missing!${NC}"
  fi
done

# 8. Workers Check
echo -e "\n${YELLOW}=== Cloudflare Workers ===${NC}"
if [ -d workers ]; then
  for worker in workers/*/; do
    WORKER_NAME=$(basename "$worker")
    if [ -f "$worker/wrangler.toml" ]; then
      echo -n "$WORKER_NAME: "
      if (cd "$worker" && npx wrangler whoami >/dev/null 2>&1); then
        echo -e "${GREEN}configured${NC}"
      else
        echo -e "${YELLOW}not authenticated${NC}"
      fi
    fi
  done
else
  echo "No workers directory found"
fi

# 9. Supabase Check
echo -e "\n${YELLOW}=== Supabase ===${NC}"
if command -v supabase &> /dev/null; then
  supabase status 2>/dev/null || echo "Supabase not linked to this project"
else
  echo "Supabase CLI not installed"
fi

# 10. Port Check
echo -e "\n${YELLOW}=== Port Status ===${NC}"
for PORT in 3000 3001 5432 54321; do
  if lsof -i :$PORT >/dev/null 2>&1; then
    PROC=$(lsof -i :$PORT | tail -1 | awk '{print $1}')
    echo -e "Port $PORT: ${YELLOW}In use by $PROC${NC}"
  else
    echo -e "Port $PORT: ${GREEN}Available${NC}"
  fi
done

# Summary
echo -e "\n${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}Diagnostic complete. Check any RED items above.${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}"
