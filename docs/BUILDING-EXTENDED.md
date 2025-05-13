# Building n8n from Source - Extended Guide

This document provides comprehensive instructions on how to build the n8n project from source, suitable for both new and experienced developers.

## Prerequisites

- **Node.js**: Recommended version 18.x or later. Download from [nodejs.org](https://nodejs.org/en/).
- **pnpm**: Preferred package manager for this project. Install via npm:

```bash
npm install -g pnpm
```

- **Git**: To clone the repository.

## Cloning the Repository

Clone the official n8n repository from GitHub:

```bash
git clone https://github.com/n8n-io/n8n.git
cd n8n
```

## Installing Dependencies

Use pnpm to install all required dependencies:

```bash
pnpm install
```

This will install all packages needed for development and building.

## Building the Project

To build the project, run:

```bash
pnpm run build
```

This compiles the TypeScript source code and prepares the project for running.

## Running the Development Server

Start the development server with:

```bash
pnpm run dev
```

This launches the n8n editor locally, accessible at [http://localhost:5678](http://localhost:5678).

## Running Tests

To run the test suite, use:

```bash
pnpm run test
```

This runs all unit and integration tests to verify the project integrity.

## Additional Tips

- For debugging, you can use your IDE’s debugging tools with the built source.
- Keep your dependencies updated regularly by running `pnpm update`.
- Refer to the [CONTRIBUTING.md](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md) for detailed development guidelines.

## Support and Resources

- Community forum: [https://community.n8n.io](https://community.n8n.io)
- Official documentation: [https://docs.n8n.io](https://docs.n8n.io)
- GitHub repository: [https://github.com/n8n-io/n8n](https://github.com/n8n-io/n8n)

---

This extended guide aims to provide a clear and thorough guide to building and developing n8n from source, helping contributors get started quickly and efficiently.
