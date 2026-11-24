# Bundle Optimization Strategies

Comprehensive guide to reducing JavaScript bundle size for faster load times.

## Why Bundle Size Matters

**Impact on User Experience**:
- 100KB bundle (gzipped) → ~1s load on 3G
- 500KB bundle (gzipped) → ~5s load on 3G
- Every 100KB adds ~1s to Time to Interactive

**Business Impact**:
- Pinterest: -40% load time → +15% conversions
- AutoAnything: -50% load time → +12-13% sales
- BBC: Every 1s slower → -10% users

---

## Current State Analysis

### Step 1: Measure Your Bundle

```bash
# Next.js
npm run build

# Webpack
npx webpack --profile --json > stats.json
npx webpack-bundle-analyzer stats.json

# Vite
npm run build
# Check dist/ folder size
```

### Step 2: Set Targets

| Bundle Size (gzipped) | Rating | Action |
|----------------------|--------|--------|
| &lt;100KB | ✅ Excellent | Maintain |
| 100-300KB | ⚠️ Good | Monitor |
| 300-500KB | 🔴 Large | Optimize |
| &gt;500KB | 🚨 Critical | Immediate action |

---

## Strategy 1: Code Splitting

### Route-Based Splitting (Easiest Win)

**Before** (single bundle):
```typescript
import Home from './pages/Home';
import About from './pages/About';
import Dashboard from './pages/Dashboard';  // 500KB
```

**After** (split by route):
```typescript
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

**Impact**: Main bundle: 800KB → 300KB (500KB lazy-loaded)

---

### Component-Based Splitting

Split heavy components that aren't always shown:

```typescript
import { lazy, Suspense } from 'react';

// ❌ Always loaded (even if modal never opens)
import PDFViewer from './PDFViewer';  // 200KB

// ✅ Loaded on demand
const PDFViewer = lazy(() => import('./PDFViewer'));

function App() {
  const [showPDF, setShowPDF] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPDF(true)}>View PDF</button>

      {showPDF && (
        <Suspense fallback={<Spinner />}>
          <PDFViewer url="/document.pdf" />
        </Suspense>
      )}
    </div>
  );
}
```

**When to split**:
- Modals/dialogs
- Admin panels
- Charts/visualizations
- Rich text editors
- Video players

---

### Vendor Splitting

Separate third-party code from your app code:

**webpack.config.js**:
```javascript
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // Vendor chunk (rarely changes)
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        // Common code shared across pages
        common: {
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

**Benefit**: Vendor bundle cached long-term (changes infrequently)

---

## Strategy 2: Tree Shaking

### Use ES Modules (ESM)

**❌ CommonJS** (entire library imported):
```javascript
const _ = require('lodash');  // 500KB
_.debounce(() => {}, 300);
```

**✅ ES Modules** (only imported function included):
```javascript
import { debounce } from 'lodash-es';  // ~5KB
debounce(() => {}, 300);
```

**Impact**: 500KB → 5KB (99% reduction)

---

### Import Only What You Need

**❌ Whole library**:
```javascript
import * as MUI from '@mui/material';  // 300KB

function App() {
  return <MUI.Button>Click</MUI.Button>;
}
```

**✅ Specific imports**:
```javascript
import Button from '@mui/material/Button';  // 50KB

function App() {
  return <Button>Click</Button>;
}
```

---

### Configure Babel for Tree Shaking

**.babelrc**:
```json
{
  "presets": [
    ["@babel/preset-env", {
      "modules": false  // Don't transform ES modules
    }]
  ]
}
```

Without `"modules": false`, Babel converts ESM to CommonJS, breaking tree-shaking.

---

## Strategy 3: Replace Heavy Dependencies

### Common Swaps

| Old Library | Size | New Library | Size | Savings |
|-------------|------|-------------|------|---------|
| moment.js | 288KB | date-fns | 28KB | 90% |
| lodash | 500KB | lodash-es | 5KB* | 99%* |
| axios | 50KB | native fetch | 0KB | 100% |
| react-router-dom | 45KB | wouter | 1.2KB | 97% |
| recharts | 400KB | victory-native | 50KB | 87% |

\* When importing only needed functions

---

### Example: Replace moment.js with date-fns

**Before**:
```javascript
import moment from 'moment';  // 288KB

const formatted = moment(date).format('MMM DD, YYYY');
const relative = moment(date).fromNow();
```

**After**:
```javascript
import { format, formatDistanceToNow } from 'date-fns';  // 28KB

const formatted = format(date, 'MMM dd, yyyy');
const relative = formatDistanceToNow(date, { addSuffix: true });
```

**Impact**: -260KB (-90%)

---

### Example: Replace axios with fetch

**Before**:
```javascript
import axios from 'axios';  // 50KB

const response = await axios.get('/api/users');
const data = response.data;
```

**After**:
```javascript
// Native fetch (0KB)
const response = await fetch('/api/users');
const data = await response.json();
```

**Impact**: -50KB (-100%)

**Note**: For complex use cases, consider `ky` (5KB) as lightweight axios alternative

---

## Strategy 4: Externalize Large Dependencies

Move rarely-changing libraries to CDN:

**index.html**:
```html
<!-- React from CDN -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

**webpack.config.js**:
```javascript
module.exports = {
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
};
```

**Impact**: Bundle size: 500KB → 450KB (React now loaded from CDN)

**Trade-offs**:
- ✅ Smaller bundle
- ✅ CDN caching across sites
- ❌ Extra HTTP request
- ❌ Dependency on CDN availability

---

## Strategy 5: Remove Unused Code

### Analyze with Bundle Analyzer

```bash
npx webpack-bundle-analyzer stats.json
```

**Look for**:
- Libraries you don't remember installing
- Multiple versions of same library
- Test utilities in production bundle
- Polyfills for features you don't use

---

### Example: Remove Unused Polyfills

**Before** (polyfills for IE11):
```javascript
import 'core-js/stable';  // 200KB
import 'regenerator-runtime/runtime';  // 50KB
```

**After** (modern browsers only):
```javascript
// Remove polyfills
// Assume target: "es2020" in tsconfig.json
```

**Impact**: -250KB if targeting modern browsers

---

### Remove Development-Only Code

**.babelrc** (production):
```json
{
  "plugins": [
    ["transform-remove-console", { "exclude": ["error", "warn"] }]
  ]
}
```

**webpack.config.js**:
```javascript
module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
};
```

This removes PropTypes, debug logs, and dev warnings.

---

## Strategy 6: Optimize Images and Assets

### Use Next-Gen Formats

| Format | Size | Browser Support |
|--------|------|-----------------|
| PNG | 100KB | All |
| JPEG | 50KB | All |
| WebP | 30KB | 96% |
| AVIF | 20KB | 89% |

**Implementation**:
```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

---

### Lazy Load Images

```typescript
function ImageGallery({ images }) {
  return (
    <div>
      {images.map(img => (
        <img
          key={img.id}
          src={img.url}
          loading="lazy"  // Native lazy loading
          alt={img.alt}
        />
      ))}
    </div>
  );
}
```

**Impact**: Initial page load doesn't download off-screen images

---

### Inline Small Assets

**webpack.config.js**:
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024  // Inline if &lt;8KB
          }
        }
      }
    ]
  }
};
```

**Benefit**: Small images become base64 data URLs (no extra HTTP requests)

---

## Strategy 7: Compression

### Enable Gzip/Brotli

**Server config** (nginx):
```nginx
# Gzip
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# Brotli (better compression)
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

**Impact**: 500KB bundle → 100KB gzipped (80% reduction)

**Brotli vs Gzip**: Brotli ~20% smaller than Gzip for text

---

### Pre-compress at Build Time

```bash
# Generate .gz and .br files at build
npx webpack --mode production
gzip -k dist/*.js
brotli dist/*.js
```

**Benefit**: Server doesn't compress on-the-fly (faster response)

---

## Strategy 8: Minification

### Terser (Webpack Default)

**webpack.config.js**:
```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,  // Remove console.log
            drop_debugger: true,
          },
          mangle: true,  // Shorten variable names
        },
      }),
    ],
  },
};
```

---

### CSS Minification

```bash
npm install -D css-minimizer-webpack-plugin
```

**webpack.config.js**:
```javascript
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      '...',  // Keep existing minimizers
      new CssMinimizerPlugin(),
    ],
  },
};
```

---

## Strategy 9: Dynamic Imports for Features

Split features that not all users need:

```typescript
function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  const loadAdminPanel = async () => {
    // Only load admin code when needed
    const { AdminPanel } = await import('./AdminPanel');
    setShowAdmin(true);
  };

  return (
    <div>
      {user.isAdmin && (
        <button onClick={loadAdminPanel}>Open Admin</button>
      )}

      {showAdmin && <AdminPanel />}
    </div>
  );
}
```

**Impact**: Admin code (200KB) not loaded for regular users

---

## Strategy 10: Prefetch/Preload Strategic Resources

### Prefetch Next Page

```typescript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));

function Home() {
  useEffect(() => {
    // Prefetch dashboard during idle time
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/dashboard.js';
    document.head.appendChild(link);
  }, []);

  return <div>Home</div>;
}
```

**Benefit**: Dashboard loads instantly when user navigates to it

---

### Preload Critical Resources

```html
<head>
  <!-- Load critical font before anything else -->
  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>

  <!-- Preload critical CSS -->
  <link rel="preload" href="/critical.css" as="style">
</head>
```

---

## Real-World Example

### Problem: 2.5MB Bundle

**Before**:
```
Main bundle:     2.5MB (uncompressed)
Gzipped:         650KB
Time to Interactive: 8 seconds on 3G
```

**Issues Found**:
1. Entire app in one bundle (no code splitting)
2. moment.js (288KB) for simple date formatting
3. Lodash CommonJS import (500KB)
4. Chart library always loaded (400KB)
5. Multiple polyfills (250KB)
6. No compression

**Fixes Applied**:
1. Route-based code splitting → -800KB
2. Replace moment.js with date-fns → -260KB
3. Use lodash-es with tree shaking → -495KB
4. Lazy load chart component → -400KB
5. Remove unnecessary polyfills → -250KB
6. Enable Brotli compression → 80% reduction

**After**:
```
Main bundle:     250KB (uncompressed)
Brotli:          50KB
Time to Interactive: 1.2 seconds on 3G
```

**Result**: 8s → 1.2s (85% faster)

---

## Production Checklist

```
□ Routes code-split with React.lazy
□ Heavy components lazy-loaded
□ Tree-shakeable imports (ES modules)
□ Replaced heavy dependencies (moment → date-fns)
□ Removed unused code (bundle analyzer checked)
□ Compression enabled (Brotli > Gzip)
□ Images optimized and lazy-loaded
□ Source maps not shipped to production
□ Minification enabled (Terser for JS, CSSMini for CSS)
□ Bundle analyzed (no duplicate dependencies)
□ Target: Main bundle &lt;300KB gzipped
□ Target: TTI &lt;3 seconds on 3G
```

---

## Resources

- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Bundlephobia](https://bundlephobia.com/) - Find library sizes
- [Bundle.js.org](https://bundle.js.org/) - Compare bundle sizes
- [Can I Use](https://caniuse.com/) - Check browser support
