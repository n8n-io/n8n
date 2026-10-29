Local QA notes for this branch.

This branch replaces `ElMenu`, `ElSubMenu`, and `ElMenuItem` with `N8nNavigationDropdown`. The only screen is the sidebar create menu. Open it from the plus button. Confirm the items, a nested menu, a link, and Escape.

## Create menu

Open any project page. Choose the plus button in the sidebar header.

- **New workflow**, **New credential**, and **New agent** appear. Agent sits directly under workflow.
- Choose **New workflow**. The editor opens for a new workflow.
- When the instance has projects, **New workflow** opens a nested menu. Hover it. Choose a project. The editor opens in that project.
- A locked or unlicensed row stays disabled. Its lock or upgrade control still works.
- Press Escape. The menu closes. Click outside. The menu closes.
- `packages/frontend/@n8n/design-system/src/components/N8nNavigationDropdown/NavigationDropdown.vue`
- `packages/frontend/editor-ui/src/app/components/MainSidebarHeader.vue`
