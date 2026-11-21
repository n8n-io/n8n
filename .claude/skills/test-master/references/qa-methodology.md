# QA Methodology

## Manual Testing Types

### Exploratory Testing
```markdown
**Charter**: Explore {feature} with focus on {aspect}
**Duration**: 60-90 min
**Mission**: Find defects in {specific functionality}

Test Ideas:
- Boundary conditions & edge cases
- Error handling & recovery
- User workflow variations
- Integration points

Findings:
1. [HIGH] {Issue + impact}
2. [MED] {Issue + impact}

Coverage: {Areas explored} | Risks: {Identified risks}
```

### Usability Testing
```markdown
**Task**: Can users complete {action} intuitively?
**Metrics**: Time to complete, errors made, satisfaction (1-5)
**Success**: 80% complete without help in <5 min

Observations:
- Navigation confusing at {step}
- Users expect {A} but get {B}
- Positive: {feature feedback}
```

### Accessibility Testing (WCAG 2.1 AA)
```typescript
test('accessibility compliance', async ({ page }) => {
  // Keyboard navigation
  await page.keyboard.press('Tab');
  expect(['A', 'BUTTON', 'INPUT']).toContain(
    await page.evaluate(() => document.activeElement.tagName)
  );
  
  // ARIA labels
  expect(await page.getByRole('button').first().getAttribute('aria-label')).toBeTruthy();
  
  // Color contrast (axe-core)
  const violations = await page.evaluate(async () => {
    const axe = await import('axe-core');
    return (await axe.run()).violations;
  });
  expect(violations).toHaveLength(0);
});
```

### Localization Testing
```markdown
**Test**: {Feature} in {language/locale}
- [ ] Text displays without truncation
- [ ] Date/time/currency formats correct
- [ ] Right-to-left layout (Arabic, Hebrew)
- [ ] Character encoding UTF-8
- [ ] Sort order respects locale
```

### Compatibility Matrix
```markdown
| Browser | Version | OS | Status |
|---------|---------|----|----- --|
| Chrome | Latest | Win/Mac | ✓ |
| Firefox | Latest | Win/Mac | ✓ |
| Safari | Latest | macOS/iOS | ✓ |
| Edge | Latest | Windows | ✓ |
```

## Test Design Techniques

### Pairwise Testing
```typescript
// Test all parameter pairs efficiently
const pairwiseTests = [
  { browser: 'chrome', os: 'windows', lang: 'en' },
  { browser: 'firefox', os: 'mac', lang: 'es' },
  { browser: 'safari', os: 'windows', lang: 'fr' },
  // Covers all pairs with minimal tests
];
```

### Risk-Based Testing
```markdown
| Risk | Probability | Impact | Priority | Test Effort |
|------|-------------|--------|----------|-------------|
| Critical | High | High | P0 | Exhaustive |
| High | Med-High | High | P1 | Comprehensive |
| Medium | Low-Med | Med | P2 | Standard |
| Low | Low | Low | P3 | Smoke only |
```

## Defect Management

### Root Cause Analysis (5 Whys)
```markdown
1. Why did defect occur? {User input not validated}
2. Why wasn't it validated? {Validation logic missing}
3. Why was it missing? {Requirement unclear}
4. Why was requirement unclear? {Acceptance criteria incomplete}
5. Why incomplete? {No QA review in planning}

**Root Cause**: QA not involved in requirements phase
**Prevention**: Add QA to all planning meetings
```

### Defect Report Template
```markdown
## [CRITICAL] {Defect Title}

**Steps to Reproduce**:
1. {Step 1}
2. {Step 2}

**Expected**: {Should happen}
**Actual**: {Actually happens}
**Impact**: {Business/user impact}
**Root Cause**: {Why it happened}
**Fix**: {Recommended solution}
```

## Quality Metrics

### Key Calculations
```typescript
// Defect Removal Efficiency (target: >95%)
const dre = (defectsInTesting / (defectsInTesting + defectsInProd)) * 100;

// Defect Leakage (target: <5%)
const leakage = (defectsInProd / totalDefects) * 100;

// Test Effectiveness (target: >90%)
const effectiveness = (defectsFoundByTests / totalDefects) * 100;

// Automation ROI
const roi = (timeSaved - maintenanceCost - developmentCost) / developmentCost;
```

### Quality Dashboard
```markdown
| Metric | Target | Actual | Trend | Status |
|--------|--------|--------|-------|--------|
| Coverage | >80% | 87% | ↑ | ✓ |
| Defect Leakage | <5% | 3% | ↓ | ✓ |
| Automation | >70% | 68% | ↑ | ⚠ |
| Critical Defects | 0 | 0 | → | ✓ |
| MTTR | <48h | 36h | ↓ | ✓ |
```

## Continuous Testing & Shift-Left

### Shift-Left Activities
```markdown
**Early Testing**:
- Review requirements for testability
- Create test cases during design
- TDD: unit tests with code
- Automated tests in CI pipeline
- Static analysis on commit
- Security scanning pre-merge

**Benefits**: 10x cheaper defect fixes, faster feedback
```

### Feedback Cycle Targets
```typescript
const feedbackCycle = {
  unitTests: '< 5 min',       // On save
  integration: '< 15 min',    // On commit
  e2e: '< 30 min',            // On PR
  regression: '< 2 hours',    // Nightly
};
```

## Quality Advocacy

### Quality Gates
```markdown
## Production Release Gate

**Must Pass (Blockers)**:
- [ ] Zero critical defects
- [ ] Coverage >80%
- [ ] All P0/P1 tests passing
- [ ] Performance SLA met
- [ ] Security scan clean
- [ ] Accessibility WCAG AA

**Decision**: GO | NO-GO | GO with exceptions
```

### Team Education Program
```markdown
**Week 1-2**: Test fundamentals
**Week 3-4**: Automation basics
**Week 5-6**: Advanced topics (perf, security, API)
**Ongoing**: Best practices, tool updates
```

## Test Planning

### Test Plan Template
```markdown
## Test Plan: {Feature}

**Scope**: {What to test}
**Types**: Unit, Integration, E2E, Perf, Security
**Resources**: {Team allocation}
**Dependencies**: {Prerequisites}
**Schedule**: {Timeline}
**Entry Criteria**: {Start conditions}
**Exit Criteria**: {Completion conditions}
**Risks**: {Identified risks + mitigation}
```

### Environment Strategy
```markdown
| Env | Purpose | Data | Refresh | Access |
|-----|---------|------|---------|--------|
| Dev | Development | Synthetic | On-demand | All |
| Test | QA testing | Test data | Daily | QA |
| Stage | Pre-prod | Prod-like | Weekly | Limited |
| Prod | Live | Real | N/A | Ops |
```

## Quick Reference

| Testing Type | When | Duration |
|--------------|------|----------|
| Exploratory | New features | 60-120 min |
| Usability | UI changes | 2-4 hours |
| Accessibility | Every release | 1-2 hours |
| Localization | Multi-region | 1 day/locale |

| Metric | Excellent | Good | Needs Work |
|--------|-----------|------|------------|
| Coverage | >90% | 70-90% | <70% |
| Leakage | <2% | 2-5% | >5% |
| Automation | >80% | 60-80% | <60% |
| MTTR | <24h | 24-48h | >48h |
