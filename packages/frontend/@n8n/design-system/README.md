![n8n.io - Workflow Automation](https://user-images.githubusercontent.com/65276001/173571060-9f2f6d7b-bac0-43b6-bdb2-001da9694058.png)

# @n8n/design-system

A UI library and design system for [n8n](https://n8n.io) using Storybook to preview.

## Commands

| Command | Description |
| --- | --- |
| `pnpm install` | Install project dependencies. |
| `pnpm storybook` | Start Storybook for local development. |
| `pnpm build:storybook` | Build the static Storybook site. |
| `pnpm test:unit` | Run the unit tests. |
| `pnpm lint` | Check the source files for lint errors. |
| `pnpm build:theme` | Build the design system theme. |
| `pnpm watch:theme` | Rebuild the design system theme when files change. |

## Contributing
- Always follow the core `CONTRIBUTING.md` guidelines in the root repo. 
- Design System components should be generic, reusable across multiple areas of the product.
- Each component must have tests and stories attached
- If replacing an existing component, make sure a migration path is considered
- For brand new components, provide `component-*.md` spec using `specification/COMPONENT_API_SPEC_TEMPLATE.md` for review first

## Owners
@n8n/design

## License
You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
