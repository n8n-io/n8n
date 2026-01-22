# Cleanup Upgrade CTA Experiment (GRO-207)

## Overview

Remove the `054_upgrade_plan_cta` PostHog experiment from the codebase. The **control** variant won, meaning the sidebar upgrade CTA should not be shown to trial users.

## Background

The experiment tested whether showing an "Upgrade" button in the main sidebar for cloud trial users would increase conversions. The control (no button) won, so we're removing:

- The experiment definition
- The variant behavior (sidebar upgrade button)
- Related test code

## Changes

### 1. Remove Experiment Definition

**File:** `packages/frontend/editor-ui/src/app/constants/experiments.ts`

- Remove `UPGRADE_PLAN_CTA_EXPERIMENT` constant
- Remove from `EXPERIMENTS_TO_TRACK` array

### 2. Clean Up Cloud Plan Store

**File:** `packages/frontend/editor-ui/src/app/stores/cloudPlan.store.ts`

- Remove `UPGRADE_PLAN_CTA_EXPERIMENT` import
- Remove `isTrialUpgradeOnSidebar` computed property
- Remove from store's return object

### 3. Delete Sidebar Component

**File to delete:** `packages/frontend/editor-ui/src/app/components/MainSidebarTrialUpgrade.vue`

- Delete entire component file
- Remove imports/usage from parent component

### 4. Update E2E Tests

**File:** `packages/testing/playwright/tests/e2e/cloud/cloud.spec.ts`

- Remove tests that verify experiment variant behavior
- Keep tests for control behavior if still relevant

## Not Changed

- `SettingsApiView.vue` - The `public-api-upgrade-cta` is separate functionality for API key upsell
- `SettingsPersonalPage.ts` - Test helper is for API settings CTA, unrelated to sidebar experiment

## Linear Ticket

https://linear.app/n8n/issue/GRO-207
