# Community Packages Architecture

> **⚠️ Notice**: This documentation was created by AI and not properly reviewed by the team yet.

## Overview

The community packages system allows n8n to dynamically load and manage external node packages installed via npm. This provides extensibility while maintaining security and stability.

## TODO: Document the Following

### System Components
- `CommunityPackagesService` - Package management service
- Package discovery and loading mechanism
- NPM integration
- Security validation

### Architecture
- Package installation flow
- Dynamic node loading at runtime
- Package isolation
- Version management

### Key Features
- NPM package installation
- Package validation and security checks
- Dynamic node registration
- Package updates and removal
- Dependency management

### Implementation Details
- Location: `packages/cli/src/services/community-packages/`
- Key files:
  - `community-packages.service.ts`
  - Package loader implementation
  - Security validators
- Naming convention: `n8n-nodes-*`

### Security Considerations
- Package validation before installation
- Sandboxing and isolation
- Permission restrictions
- Vulnerability scanning

### Package Structure
- Required package.json format
- Node file conventions
- Credential definitions
- Icon and documentation requirements

### Configuration
- Allowed/blocked package lists
- Installation directory
- Security policies
- Auto-update settings

## References
- Community Packages Service: `packages/cli/src/services/community-packages/`
- Node loading: `packages/cli/src/load-nodes-and-credentials.ts`
- Package conventions: [Creating Nodes documentation]
