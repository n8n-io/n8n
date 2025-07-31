# Frontend Architecture

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

The n8n frontend is a Vue 3 application that provides the workflow editor interface. This document covers the component architecture, canvas implementation, routing, and key architectural patterns.

## TODO: Document the Following

### Technology Stack

- **Framework**: Vue 3 with Composition API
- **State Management**: Pinia
- **Routing**: Vue Router
- **UI Library**: Custom design system (@n8n/design-system)
- **Canvas**: Custom implementation with vue-flow/xy-flow
- **Build Tool**: Vite
- **Type Safety**: TypeScript

### Project Structure

```
packages/frontend/editor-ui/src/
├── components/        # Vue components
├── composables/      # Reusable composition functions
├── stores/          # Pinia state stores
├── views/           # Page-level components
├── router/          # Route definitions
├── api/             # API client layer
├── plugins/         # Vue plugins
├── utils/           # Utility functions
└── styles/          # Global styles
```

### Component Architecture

#### Core Components

##### WorkflowCanvas
- **Location**: `/packages/frontend/editor-ui/src/components/WorkflowCanvas.vue`
- **Purpose**: Main canvas for workflow editing
- **Key features**:
  - Node rendering and positioning
  - Connection drawing
  - Drag and drop handling
  - Zoom and pan controls

##### Node Component
- **Location**: `/packages/frontend/editor-ui/src/components/Node.vue`
- **Responsibilities**:
  - Node visualization
  - Execution state display
  - Input/output endpoints
  - Context menu integration

##### NodeDetailsView (NDV)
- **Location**: `/packages/frontend/editor-ui/src/components/NodeDetailsView.vue`
- **Purpose**: Node configuration panel
- **Features**:
  - Dynamic parameter forms
  - Input/output data display
  - Execution results

##### ConnectionLine
- **Location**: `/packages/frontend/editor-ui/src/components/ConnectionLine.vue`
- **Purpose**: Visual connections between nodes
- **Features**:
  - Path calculation
  - Animation during execution
  - Connection type indicators

### Canvas Implementation

#### Rendering Strategy
- Virtual scrolling for large workflows
- Canvas coordinate system
- Performance optimizations
- WebGL considerations

#### Interaction Handling
- Mouse and touch events
- Keyboard shortcuts
- Gesture recognition
- Multi-selection

#### Layout Engine
- Auto-layout algorithms
- Node positioning
- Connection routing
- Collision detection

### Component Communication

#### Event Bus Pattern
- Canvas events
- Global notifications
- Cross-component messaging

#### Props and Emits
- Parent-child communication
- v-model patterns
- Event bubbling

#### Provide/Inject
- Dependency injection
- Shared utilities
- Theme context

### Routing Architecture

#### Route Structure
- Main routes vs modal routes
- Route guards and authentication
- Dynamic route generation
- Query parameter handling

#### Navigation Patterns
- Workflow switching
- Deep linking
- Browser history management
- Unsaved changes handling

### Data Flow

#### API Integration
- REST client implementation
- Request/response interceptors
- Error handling
- Loading states

#### Real-time Updates
- WebSocket integration
- Server-sent events
- Optimistic updates
- Conflict resolution

### Performance Optimization

#### Rendering Performance
- Component lazy loading
- Virtual scrolling
- Memoization strategies
- Re-render optimization

#### Bundle Optimization
- Code splitting
- Tree shaking
- Dynamic imports
- Asset optimization

### Design System Integration

#### Component Library
- **Package**: `@n8n/design-system`
- Atomic design principles
- Theme customization
- Accessibility features

#### Styling Architecture
- CSS modules vs global styles
- Theme variables
- Responsive design
- Dark mode support

### Testing Architecture

#### Component Testing
- Unit tests with Vitest
- Component mounting strategies
- Mock providers
- Snapshot testing

#### E2E Testing
- Cypress test structure
- Page objects pattern
- Test data management

## Key Questions to Answer

1. How is the canvas rendering optimized for large workflows?
2. What patterns are used for component communication?
3. How are dynamic forms generated for node parameters?
4. What's the architecture for real-time collaboration?
5. How is routing integrated with workflow state?
6. What are the performance bottlenecks?
7. How is the design system integrated?
8. What testing strategies are employed?

## Related Documentation

- [Frontend State Management](./frontend-state-management.md) - Pinia store architecture
- [WebSocket & Real-time](./websocket-realtime.md) - Real-time features
- [API Architecture](./api-architecture.md) - Backend communication

## Code Locations to Explore

- `/packages/frontend/editor-ui/src/components/` - All Vue components
- `/packages/frontend/editor-ui/src/views/` - Page components
- `/packages/frontend/editor-ui/src/composables/` - Composition API utilities
- `/packages/frontend/editor-ui/src/router/` - Route definitions
- `/packages/frontend/@n8n/design-system/` - UI component library
- `/packages/frontend/editor-ui/src/__tests__/` - Test files
