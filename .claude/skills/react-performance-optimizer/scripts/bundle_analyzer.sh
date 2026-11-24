#!/bin/bash
# Bundle Analyzer Script
#
# Analyzes webpack bundle to identify large dependencies and optimization opportunities.
#
# Usage:
#   ./bundle_analyzer.sh
#   ./bundle_analyzer.sh --no-open    # Don't open browser
#   ./bundle_analyzer.sh --json       # Generate JSON report
#
# Requirements:
#   npm install -D webpack-bundle-analyzer
#
# For Next.js projects, install @next/bundle-analyzer instead

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OPEN_BROWSER=true
JSON_MODE=false
BUILD_DIR="dist"
STATS_FILE="stats.json"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --no-open)
      OPEN_BROWSER=false
      shift
      ;;
    --json)
      JSON_MODE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: ./bundle_analyzer.sh [--no-open] [--json]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}📦 Bundle Analyzer${NC}\n"

# Detect project type
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
  PROJECT_TYPE="nextjs"
  echo -e "${GREEN}Detected: Next.js project${NC}"
elif [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
  PROJECT_TYPE="vite"
  echo -e "${GREEN}Detected: Vite project${NC}"
elif grep -q "react-scripts" package.json 2>/dev/null; then
  PROJECT_TYPE="cra"
  echo -e "${GREEN}Detected: Create React App${NC}"
else
  PROJECT_TYPE="webpack"
  echo -e "${GREEN}Detected: Webpack project${NC}"
fi

# Function to analyze Next.js bundle
analyze_nextjs() {
  echo -e "\n${YELLOW}Setting up Next.js bundle analyzer...${NC}"

  # Check if analyzer is installed
  if ! grep -q "@next/bundle-analyzer" package.json; then
    echo -e "${YELLOW}Installing @next/bundle-analyzer...${NC}"
    npm install -D @next/bundle-analyzer
  fi

  # Create or update next.config.js
  if [ -f "next.config.js" ]; then
    echo -e "${YELLOW}Backup existing next.config.js...${NC}"
    cp next.config.js next.config.js.backup
  fi

  # Add analyzer to config
  cat > next.config.analyzer.js << 'EOF'
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Your existing config here
}

module.exports = withBundleAnalyzer(nextConfig)
EOF

  echo -e "${GREEN}Running Next.js build with analyzer...${NC}\n"
  ANALYZE=true npm run build

  echo -e "\n${GREEN}✅ Analysis complete!${NC}"
  echo -e "Reports generated in .next/analyze/"
}

# Function to analyze Vite bundle
analyze_vite() {
  echo -e "\n${YELLOW}Setting up Vite bundle analyzer...${NC}"

  # Check if plugin is installed
  if ! grep -q "rollup-plugin-visualizer" package.json; then
    echo -e "${YELLOW}Installing rollup-plugin-visualizer...${NC}"
    npm install -D rollup-plugin-visualizer
  fi

  # Add to vite.config.ts
  echo -e "${YELLOW}Add visualizer plugin to vite.config.ts:${NC}"
  cat << 'EOF'

import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
});
EOF

  echo -e "\n${YELLOW}Run: npm run build${NC}"
  echo -e "Then open: dist/stats.html\n"
}

# Function to analyze CRA bundle
analyze_cra() {
  echo -e "\n${YELLOW}Setting up CRA bundle analyzer...${NC}"

  # Install analyzer
  if ! grep -q "source-map-explorer" package.json; then
    echo -e "${YELLOW}Installing source-map-explorer...${NC}"
    npm install -D source-map-explorer
  fi

  # Add script to package.json
  echo -e "${YELLOW}Add to package.json scripts:${NC}"
  cat << 'EOF'

"analyze": "source-map-explorer 'build/static/js/*.js'"
EOF

  echo -e "\n${GREEN}Running production build...${NC}\n"
  npm run build

  echo -e "\n${GREEN}Analyzing bundle...${NC}\n"
  npm run analyze
}

# Function to analyze webpack bundle
analyze_webpack() {
  echo -e "\n${YELLOW}Setting up webpack bundle analyzer...${NC}"

  # Check if analyzer is installed
  if ! grep -q "webpack-bundle-analyzer" package.json; then
    echo -e "${YELLOW}Installing webpack-bundle-analyzer...${NC}"
    npm install -D webpack-bundle-analyzer
  fi

  # Generate stats
  echo -e "\n${GREEN}Building with stats...${NC}\n"

  if [ -f "webpack.config.js" ]; then
    npx webpack --profile --json > stats.json
  else
    npm run build -- --stats
  fi

  # Run analyzer
  if [ -f "stats.json" ]; then
    echo -e "\n${GREEN}Opening bundle analyzer...${NC}\n"

    if [ "$OPEN_BROWSER" = true ]; then
      npx webpack-bundle-analyzer stats.json
    else
      npx webpack-bundle-analyzer stats.json --no-open
    fi
  else
    echo -e "${RED}stats.json not found. Build may have failed.${NC}"
    exit 1
  fi
}

# Main execution
case $PROJECT_TYPE in
  nextjs)
    analyze_nextjs
    ;;
  vite)
    analyze_vite
    ;;
  cra)
    analyze_cra
    ;;
  webpack)
    analyze_webpack
    ;;
esac

# Print optimization tips
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Bundle Optimization Tips${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}Look for:${NC}"
echo -e "  🔍 Large dependencies (>100KB)"
echo -e "  🔍 Duplicate dependencies (different versions)"
echo -e "  🔍 Unused dependencies"
echo -e "  🔍 Development dependencies in production bundle"
echo ""

echo -e "${YELLOW}Common fixes:${NC}"
echo -e "  ✅ Code splitting: Use dynamic import() for routes"
echo -e "  ✅ Tree-shaking: Use ESM imports (import { x } from 'lib')"
echo -e "  ✅ Smaller alternatives:"
echo -e "     - moment.js → date-fns (10x smaller)"
echo -e "     - lodash → lodash-es (tree-shakeable)"
echo -e "     - axios → native fetch"
echo -e "  ✅ Externalize: Move large libs to CDN"
echo -e "  ✅ Lazy load: Use React.lazy() for components"
echo ""

echo -e "${YELLOW}Target bundle sizes (gzipped):${NC}"
echo -e "  🎯 Excellent: <100KB"
echo -e "  ⚠️  Good: 100-300KB"
echo -e "  🔴 Large: >300KB (needs optimization)"
echo ""

# Calculate current bundle size
if [ -d "$BUILD_DIR/static/js" ]; then
  TOTAL_SIZE=$(du -sh "$BUILD_DIR/static/js" | cut -f1)
  echo -e "${GREEN}Current JS bundle size: $TOTAL_SIZE${NC}"
elif [ -d ".next/static" ]; then
  TOTAL_SIZE=$(du -sh ".next/static" | cut -f1)
  echo -e "${GREEN}Current bundle size: $TOTAL_SIZE${NC}"
fi

echo ""
