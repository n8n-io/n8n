# Community Nodes Settings — Redesign per PR #28298 Review

- **Date**: 2026-04-30
- **PR under revision**: [#28298](https://github.com/n8n-io/n8n/pull/28298) — *feat(editor): Add browse tab to community nodes settings page*
- **Linear**: [NODE-3727](https://linear.app/n8n/issue/NODE-3727)
- **Branch**: `node-3727-browse-community-nodes-from-settings` (existing PR branch)
- **Author**: Garrit Franke (driving), with feedback from David Arens, David Roberts, Jake Ranallo

## 1. Context & motivation

PR #28298 introduces a `Browse` tab to `Settings > Community Nodes`, allowing
users to discover and install verified community packages without leaving
Settings. After the PR was opened, the team review surfaced five pieces of
feedback that require structural changes before merge:

| # | From | Theme | Decision |
|---|------|-------|----------|
| 1 | David Arens | List should make it explicit these are *verified* community nodes, not all community nodes | Add a flag-gated subheader (Section 4.2) |
| 2 | David Roberts | Grids are inferior to lists for textual content | Replace card grid with vertical row list (Section 3) |
| 3 | Jake Ranallo | Use the same filter pattern other lists use; collapse Official/Community into a dropdown filter | Reuse `ResourcesListLayout` with `Type` select + `Installed only` checkbox in the filter popover (Section 4) |
| 4 | Jake Ranallo | Show CTAs on hover for cleaner default state | Hover/focus/touch-aware reveal (Section 3.3) |
| 5 | Jake Ranallo + David Arens (agreed) | Unify Installed and Browse into one list with installed nodes shown in a different visual state | Single flat list, no tabs, no sections; install state is row state only (Section 2 + Section 3) |

Jake provided a rough mockup (`Node Discovery Mockup.png`) which is the visual
reference for this design.

## 2. Architecture & data flow

### 2.1 — File map

```
packages/frontend/editor-ui/src/features/settings/communityNodes/
├── views/
│   ├── SettingsCommunityNodesView.vue        [REWRITE]
│   └── SettingsCommunityNodesView.test.ts    [NEW]
├── components/
│   ├── CommunityPackageRow.vue               [NEW]
│   ├── CommunityPackageRow.test.ts           [NEW]
│   ├── CommunityNodesBrowser.vue             [DELETE]
│   ├── CommunityNodesBrowser.test.ts         [DELETE]
│   ├── CommunityPackageCard.vue              [DELETE]
│   └── CommunityPackageCard.test.ts          [DELETE]
├── communityNodes.types.ts                   [REVISE — rename type, add isVerified, add merge mapper]
└── communityNodes.types.test.ts              [REVISE — rename + add merge mapper cases]
```

The store change in `packages/frontend/editor-ui/src/app/stores/nodeTypes.store.ts`
introduced by PR #28298 (`vettedCommunityPackages` computed) is **kept as-is**.

### 2.2 — Unified data source

`unifiedPackages` is a `computed` declared in `SettingsCommunityNodesView.vue`
(view-level UX merging, not store-level). Three row origins:

| Origin | Source | `isVerified` | `installedVersion` | Browse metadata |
|---|---|---|---|---|
| Vetted, not installed | `nodeTypesStore.vettedCommunityPackages` only | `true` | `undefined` | from vetted |
| Vetted **and** installed | both, merged via `mergeVettedAndInstalled()` | `true` | from installed | from vetted (wins) |
| Installed, **not** vetted | `communityNodesStore.getInstalledPackages` only | `false` | from installed | empty defaults |

Packages keyed by `packageName` for de-duplication.

```ts
const unifiedPackages = computed<CommunityPackageRowData[]>(() => {
    const installedByName = new Map(
        communityNodesStore.getInstalledPackages.map((p) => [p.packageName, p]),
    );
    const vetted = nodeTypesStore.vettedCommunityPackages;

    const rows: CommunityPackageRowData[] = vetted.map((pkg) => {
        const installed = installedByName.get(pkg.packageName);
        return installed
            ? mergeVettedAndInstalled(pkg, installed, nodeTypesStore.getNodeType)
            : fromBrowsePackage(pkg);
    });

    for (const installed of communityNodesStore.getInstalledPackages) {
        if (!vetted.some((v) => v.packageName === installed.packageName)) {
            rows.push(fromInstalledPackage(installed, nodeTypesStore.getNodeType));
        }
    }

    return rows;
});
```

### 2.3 — Type changes (`communityNodes.types.ts`)

```diff
- export interface CommunityPackageCardData { ... }
+ export interface CommunityPackageRowData {
+   packageName: string;
+   authorName: string;
+   description: string;
+   isOfficialNode: boolean;
+   isVerified: boolean;          // NEW — true for verified-catalog rows
+   numberOfDownloads: number;
+   nodeCount: number;
+   nodeDescription: INodeTypeDescription | null;
+   installNodeName: string;
+   isInstalled: boolean;
+   installedVersion?: string;
+   updateAvailable?: string;
+   failedLoading?: boolean;
+ }

- export function fromBrowsePackage(pkg: CommunityPackageSummary): CommunityPackageCardData { ... }
+ export function fromBrowsePackage(pkg: CommunityPackageSummary): CommunityPackageRowData {
+   // existing fields + isVerified: true
+ }

- export function fromInstalledPackage(pkg, getNodeType): CommunityPackageCardData { ... }
+ export function fromInstalledPackage(pkg, getNodeType): CommunityPackageRowData {
+   // existing fields + isVerified: false
+ }

+ export function mergeVettedAndInstalled(
+   pkg: CommunityPackageSummary,
+   installed: PublicInstalledPackage,
+   getNodeType: (name: string) => INodeTypeDescription | null,
+ ): CommunityPackageRowData {
+   // browse-side metadata wins for description/author/downloads;
+   // installed-side state populates installedVersion/updateAvailable/failedLoading
+   // installNodeName falls back: vetted nodes[0].name → installed nodes[0].name
+   // isVerified: true
+ }
```

### 2.4 — Filtering, sorting, search

Routed through `ResourcesListLayout`:

```ts
type Filters = BaseFilters & {
    type?: 'all' | 'official' | 'community';
    installedOnly?: boolean;
};

const onFilter = (row: CommunityPackageRowData, f: Filters, matches: boolean) => {
    if (f.type === 'official') matches = matches && row.isOfficialNode;
    if (f.type === 'community') matches = matches && !row.isOfficialNode;
    if (f.installedOnly) matches = matches && row.isInstalled;

    if (f.search) {
        const q = f.search.toLowerCase().trim();
        matches = matches && (
            row.packageName.toLowerCase().includes(q) ||
            row.authorName.toLowerCase().includes(q) ||
            row.description.toLowerCase().includes(q)
        );
    }
    return matches;
};
```

Sort is provided either by `ResourcesListLayout` natively (verified during
implementation) or via a parallel `N8nSelect` placed next to the filter
popover with options `popular` (downloads desc, default) / `name` (asc) /
`recent` (`nodes[0].createdAt` desc — proxy field, same as current PR).

### 2.5 — Loading & error handling

Single `loading` ref. `initialize()` wraps both data sources:

```ts
const initialize = async () => {
    loading.value = true;
    try {
        await Promise.all([
            communityNodesStore.fetchInstalledPackages(),
            communityNodesStore.fetchAvailableCommunityPackageCount(),
            nodeTypesStore.fetchCommunityNodePreviews(),
        ]);
        trackPageView();
    } catch (error) {
        toast.showError(error, i18n.baseText('settings.communityNodes.fetchError.title'), {
            message: i18n.baseText('settings.communityNodes.fetchError.message'),
        });
    } finally {
        loading.value = false;
    }
};
```

Push connection lifecycle (`pushConnection.initialize()`, `pushStore.pushConnect()`,
matching unmount handlers) preserved 1:1 from current view.

## 3. `CommunityPackageRow.vue`

### 3.1 — Component contract

```ts
defineProps<{
    row: CommunityPackageRowData;
    loading?: boolean;
}>();

defineEmits<{ installed: [] }>();
```

Built on `N8nCard` from `@n8n/design-system`, mirroring how `CredentialCard.vue`
in `features/credentials/components/` uses the same primitive. Slot mapping:

| `N8nCard` slot | Content |
|---|---|
| `#prepend` | `NodeIcon` (existing component, `--node--icon--size: 36px`) |
| `#header` | Identity row (left) + stats (right). `N8nCard` header has built-in `space-between`. |
| default slot | Byline: `by {author} · {description}` (single line, ellipsis) |
| `#append` | State badge + hover-gated CTA + (when installed) `N8nActionToggle` |

`--card--padding` overridden to row-appropriate spacing
(`var(--spacing--xs) var(--spacing--sm)`).

### 3.2 — State / action matrix

State precedence (top to bottom; first match wins):

1. `failedLoading` → triangle-alert state
2. `hasUpdate` → update-available state
3. `isInstalled` → installed state
4. otherwise → not-installed state

| Row state | Persistent (always visible) | Hover / focus / touch reveal |
|---|---|---|
| Not installed | *empty action area* | `N8nButton` `Install` (size small, default theme) |
| Installed, no update | `N8nBadge theme="success"` (`vX.Y.Z Installed`) + `N8nActionToggle` | (no hover CTA) |
| Installed, update available | `N8nBadge theme="warning"` (`Update available`) + `N8nActionToggle` | `N8nButton variant="outline"` `Update` (replaces badge in same grid cell) |
| Installed, failed loading | `N8nIcon icon="triangle-alert" color="danger"` with tooltip + `N8nActionToggle` | (no hover CTA) |

`N8nActionToggle` is **always** visible on installed rows (small, not visually
noisy) — only the primary `N8nButton` is hover-gated.

If a row has both `failedLoading` and `hasUpdate`, the failed-loading state
wins (precedence above): the user can't successfully run an update on a
package that hasn't loaded.

### 3.3 — Hover / focus / touch behaviour

CSS-only fallback strategy, no JS:

```scss
.hoverCta {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
}

.row:hover .hoverCta,
.row:focus-within .hoverCta {
    opacity: 1;
    pointer-events: auto;
}

@media (hover: none) {
    .hoverCta { opacity: 1; pointer-events: auto; }
}

/* When the hover CTA replaces a persistent badge (Update case),
   the badge is hidden by the same hover rule; both occupy the same grid cell. */
```

Buttons stay in the DOM and are keyboard-focusable at all times. Tab focus
into the row reveals the button via `:focus-within`.

### 3.4 — Install / update / uninstall handlers

Unchanged behaviour from current `CommunityPackageCard.vue`:

- **Install**: `useInstallNode({ type: 'verified', packageName, nodeType: row.installNodeName, telemetry: { hasQuickConnect: false, source: 'cnr settings browse' } })`. Telemetry source string preserved.
- **Update**: `openCommunityPackageUpdateConfirmModal(packageName, 'instance settings')`.
- **Uninstall**: `openCommunityPackageUninstallConfirmModal(packageName)`.
- **`hasUpdate` computation**: per-row `watch` on `props.row.packageName` calls `nodeTypesStore.getCommunityNodeAttributes(nodeType?.name ?? '')`, populates `latestVerifiedVersion`. `hasUpdate` is `true` if either `isUnverifiedPackagesEnabled && row.updateAvailable` (legacy unverified path) or `isCommunityNodesFeatureEnabled && semver.gt(latestVerifiedVersion, row.installedVersion)` (verified path). Identical to current code.

### 3.5 — Identity row details

- **Package name** wrapped in `N8nExternalLink` to `${NPM_PACKAGE_DOCS_BASE_URL}${packageName}`.
- **External-link icon** (`N8nIcon icon="arrow-up-right" size="xsmall"`) follows the name.
- **Verified icon** (`N8nIcon icon="badge-check" size="small"`) with tooltip "Verified by n8n" — shown when `row.isVerified === true`. This is broader than the previous PR which only showed the badge for `row.isOfficialNode`. `isOfficialNode` rows still get richer tooltip copy ("This node is verified and built by n8n").

### 3.6 — Test ids

Single string per element:
- Row root: `data-test-id="community-package-row"`
- Install button: `data-test-id="community-package-row__install"`
- Update button: `data-test-id="community-package-row__update"`
- Action toggle: `data-test-id="community-package-row__menu"`

## 4. `SettingsCommunityNodesView.vue`

### 4.1 — Layout

Single `ResourcesListLayout` instance, no tabs:

```vue
<ResourcesListLayout
    v-model:filters="filters"
    resource-key="communityNodes"
    :resources="unifiedPackages"
    :initialize="initialize"
    :additional-filters-handler="onFilter"
    :type-props="{ itemSize: 64 }"
    :loading="loading"
    :disabled="false"
    @update:filters="updateFilter"
    @update:search="onSearchUpdated"
>
    <template #header>
        <div :class="$style.headingRow">
            <N8nHeading size="2xlarge">{{ i18n.baseText('settings.communityNodes') }}</N8nHeading>
            <N8nButton
                v-if="settingsStore.isUnverifiedPackagesEnabled"
                :label="i18n.baseText('settings.communityNodes.installFromNpm')"
                size="large"
                @click="openInstallModal"
            />
        </div>
        <N8nText size="small" color="text-light">{{ subheaderText }}</N8nText>
    </template>

    <template #default="{ data }">
        <CommunityPackageRow :row="data" @installed="refreshUnified" />
    </template>

    <template #filters="{ setKeyValue }">
        <!-- Type select + Installed-only checkbox; matches CredentialsView's pattern -->
    </template>

    <template #empty>
        <N8nActionBox
            :heading="i18n.baseText('settings.communityNodes.empty.title')"
            :description="i18n.baseText('settings.communityNodes.empty.description')"
        />
    </template>
</ResourcesListLayout>
```

### 4.2 — Subheader copy (flag-gated, addresses #1)

Two i18n keys, switched on `settingsStore.isUnverifiedPackagesEnabled`:

| Flag | Key | Copy |
|---|---|---|
| `true` | `settings.communityNodes.subheader.withNpm` | "Browse community nodes verified by n8n. To install an unverified package by npm name, use **Install from npm**." |
| `false` | `settings.communityNodes.subheader.verifiedOnly` | "Browse community nodes verified by n8n." |

Wording is provisional and can be revised without structural change.

### 4.3 — Top-right "Install from npm" button (addresses Q2)

The existing `Install` button is **kept** (current behaviour preserved) but
**relabelled** to `Install from npm` so its purpose is unambiguous next to the
in-list verified install action. Visibility is unchanged: gated by
`settingsStore.isUnverifiedPackagesEnabled`. Click handler unchanged
(`uiStore.openModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY)` + telemetry).

The button is no longer gated on `selectedTab === 'installed'` since tabs are
removed. It is always rendered when the unverified-packages flag is on.

### 4.4 — Filter slot (addresses #3)

Two filter controls in the `#filters` slot, matching `CredentialsView.vue`'s
pattern:

1. **Type** (`N8nInputLabel` + `N8nSelect`) — options `all` (default) /
   `official` / `community`. The dropdown shape reserves space for future
   filter values (e.g. by category).
2. **Installed only** (`N8nCheckbox`) — boolean, narrows the unified list to
   `row.isInstalled === true`.

Search input and result count are provided by `ResourcesListLayout` via
`resource-key="communityNodes"` (i18n keys created accordingly).

### 4.5 — Telemetry

Preserved verbatim from current view (event names + payload shapes unchanged):

- `user viewed cnr settings page` fires once in `initialize()` with the same
  payload shape (`num_of_packages_installed`, `installed_packages`,
  `packages_to_update`, `number_of_updates_available`).
- `user clicked cnr install button`:
  - From `CommunityPackageRow` install handler: payload `{ package_name, source: 'cnr settings browse' }` (matches current `CommunityPackageCard`).
  - From the top-right "Install from npm" button: payload `{ is_empty_state }` (matches current view's `openInstallModal`). Field name and value preserved exactly to avoid disrupting current dashboards.

### 4.6 — i18n migrations (`packages/frontend/@n8n/i18n/src/locales/en.json`)

**Remove**:
- `settings.communityNodes.tabs.installed`, `.tabs.browse`
- `settings.communityNodes.installed.empty.browseButton`
- `settings.communityNodes.browse.search.placeholder`,
  `.browse.resultCount`,
  `.browse.empty.title`, `.browse.empty.description`,
  `.browse.filter.all|official|community`,
  `.browse.sort.popular|name|recent`,
  `.browse.card.by|nodes|downloads|installed|install|installing`

**Rename / add**:
- `settings.communityNodes.subheader.withNpm` (Section 4.2)
- `settings.communityNodes.subheader.verifiedOnly` (Section 4.2)
- `settings.communityNodes.installFromNpm` ("Install from npm")
- `settings.communityNodes.filters.type`
- `settings.communityNodes.filters.installedOnly`
- `settings.communityNodes.filter.type.all|official|community`
- `settings.communityNodes.verified.tooltip` ("Verified by n8n")
- `settings.communityNodes.row.installed` ("Installed")
- `settings.communityNodes.row.updateAvailable` ("Update available")
- `settings.communityNodes.row.install`, `.row.installing`, `.row.update`
- `settings.communityNodes.empty.title`, `.empty.description`
- `settings.communityNodes.byline` ("by {author}") — used as the `by {author}` prefix; description is appended in template via `· {description}` separator (template-level, not interpolated, so the separator stays consistent across locales)

**Keep**:
- `settings.communityNodes.uninstallAction.label`
- `settings.communityNodes.failedToLoad.tooltip`
- `settings.communityNodes.updateAvailable.tooltip`
- `settings.communityNodes.fetchError.title|message`
- `generic.officialNode.tooltip` (used for `isOfficialNode` enriched tooltip)

## 5. Design system compliance

Per `packages/frontend/AGENTS.md` and `.agents/design-system-style-rules.md`:

- All colours, spacing, radii, borders, font sizes/weights/line-heights, and
  motion durations come from semantic tokens
  (`packages/frontend/@n8n/design-system/src/css/_tokens.scss`) or primitives
  (`_primitives.scss`). No hard-coded hex / px / rem values in component CSS.
- All UI primitives come from `@n8n/design-system`:
  `N8nCard`, `N8nBadge`, `N8nButton`, `N8nText`, `N8nIcon`, `N8nTooltip`,
  `N8nExternalLink`, `N8nActionToggle`, `N8nSelect`, `N8nOption`,
  `N8nCheckbox`, `N8nInputLabel`, `N8nLoading`, `N8nActionBox`,
  `N8nHeading`. No bespoke buttons / badges / inputs.
- Icons come from `updatedIconSet` only
  (`packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`).
- Search input debounce uses `getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)` if
  custom debouncing is needed beyond what `ResourcesListLayout` provides.
- All UI strings via `i18n.baseText()` against `@n8n/i18n`.
- `data-test-id` is a single value per element, no spaces.

No new `@n8n/design-system` components introduced.

## 6. Testing strategy

### 6.1 — `communityNodes.types.test.ts` (revise)

Existing 12 cases for `fromBrowsePackage` and `fromInstalledPackage` updated
for the renamed type. Add ~5 cases for `mergeVettedAndInstalled`:

- Browse-side metadata wins (description / downloads / author)
- `installedVersion`, `updateAvailable`, `failedLoading` from installed side
- `isVerified === true` always
- `installNodeName` falls back: vetted nodes[0] → installed nodes[0] → empty
- Both sides have empty `nodes`/`installedNodes` → `nodeCount === 0`,
  `nodeDescription === null`

Add ~3 cases asserting `isVerified` defaults: `true` from `fromBrowsePackage`,
`false` from `fromInstalledPackage`.

### 6.2 — `CommunityPackageRow.test.ts` (new, replaces card test)

~14 cases:

- Renders icon, package name, byline, node count, downloads
- Verified-icon tooltip when `isVerified === true`, hidden when `false`
- **Not installed**: no Install button visible by default (asserts CSS class
  applied); hover/focus reveals Install button (asserted via DOM presence;
  visual hover behaviour verified manually)
- **Installed, no update**: green `vX.Y.Z Installed` badge; uninstall menu
  always visible; no Install button rendered
- **Installed, has update (verified path)**: orange `Update available` badge;
  Update button rendered (hover-gated); asserted via mocked
  `getCommunityNodeAttributes` returning higher `npmVersion`
- **Installed, has update (legacy unverified path)**: same UI when
  `props.row.updateAvailable !== undefined` and `isUnverifiedPackagesEnabled`
- **Installed, failed loading**: triangle-alert icon + tooltip; no
  Install/Update button
- **Click Install**: calls `useInstallNode` with the expected args; emits
  `installed`; row flips to installed via local `installedLocally` ref
- **Click Update**: calls `openCommunityPackageUpdateConfirmModal`
- **Click action menu → Uninstall**: calls
  `openCommunityPackageUninstallConfirmModal`
- **External link**: href is `${NPM_PACKAGE_DOCS_BASE_URL}${packageName}`
- **Loading skeleton state** when `loading: true`

### 6.3 — `SettingsCommunityNodesView.test.ts` (new)

~10 cases (closes 0% coverage gap flagged by Codecov on the existing PR):

- Renders the unified rows (vetted ∪ installed)
- Subheader copy switches on `settingsStore.isUnverifiedPackagesEnabled`
- "Install from npm" button visible only when
  `isUnverifiedPackagesEnabled === true`; click opens
  `COMMUNITY_PACKAGE_INSTALL_MODAL_KEY`
- Unified data: installed-and-vetted package appears once;
  installed-but-unverified appears with `isVerified: false`
- Filter "Installed only" narrows to installed packages
- Filter "Type" = official/community filters by `isOfficialNode`
- Search matches `packageName`, `authorName`, `description`
- Empty state renders when filters yield zero rows
- Telemetry `user viewed cnr settings page` fires once with expected payload

`ResourcesListLayout` is mocked so we don't transitively pull the real
layout's dependencies into the test.

### 6.4 — Files removed from PR

- `CommunityNodesBrowser.vue` and `CommunityNodesBrowser.test.ts`
- `CommunityPackageCard.vue` and `CommunityPackageCard.test.ts`

### 6.5 — Manual verification (not automated)

- Hover / focus / touch states render correctly in a real browser
- Smoke test on `test-node-3727-browse-com.stage-app.n8n.cloud` with a few
  installed packages
- No new Playwright spec proposed; existing community-nodes E2E (if any) gets
  a smoke pass

## 7. PR description updates (housekeeping)

The current PR description references "tabbed interface", "Defaults to the
Installed tab (switches to Browse if no packages are installed)", and the
two-card-component-becoming-one refactor. After this redesign lands:

- Replace tab-related copy with "single unified list with verified browse +
  install state in row state".
- Replace "CommunityPackageCard" references with "CommunityPackageRow".
- Update "Loading state" copy: skeleton list rows, not card grid.

## 8. Out of scope (deferred)

- Adding "by category" or other filter values beyond Official / Community.
  The dropdown UI reserves space; values can land in a follow-up.
- Touch-device row → detail panel pattern (Q4 option C). Not needed if the
  hover/focus/touch fallback behaves correctly.
- Per-row verified-icon variation between `isOfficialNode` (n8n-authored) and
  generic verified packages — current design uses one icon for all, with
  richer tooltip copy for `isOfficialNode`. Visual differentiation can be a
  follow-up if desired.
- Migration to a dedicated "browse community nodes" sub-route within Settings.
- Documentation updates in `n8n-docs` (a follow-up ticket per the PR template
  checklist).

## 9. Open items confirmed during brainstorming

| Topic | Decision | Reference |
|---|---|---|
| Unified list shape (#5) | Option A — flat list, no pinning, install state via row state | Q1 answered "A" |
| Install-from-npm flow (Q2) | Option C — keep top-right button, relabel to "Install from npm" | Q2 answered "C" |
| Verified-vs-all clarity (#1) | Option A — subheader copy, flag-gated for Cloud vs self-hosted | Q3 answered "A" |
| Hover/focus/touch fallback (Q4) | Option A — `:hover`, `:focus-within`, `@media (hover: none)` | Q4 answered "A" |
| Verified checkmark scope | All vetted-catalog rows (broader than current `isOfficialNode`) | Section 3.5 |
| Filter `Type` options | All / Official / Community (dropdown leaves room for more) | Section 4.4 |
