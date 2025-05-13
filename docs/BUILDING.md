# Building n8n from Source

This document provides instructions on how to build the n8n project from source.

## Prerequisites

- Node.js (recommended version: 18.x or later)
- pnpm package manager (recommended)

## Steps to Build

1. Clone the repository:

```bash
git clone https://github.com/n8n-io/n8n.git
cd n8n
```

2. Install dependencies using pnpm:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm run build
```

4. Start the development server:

```bash
pnpm run dev
```

This will start the n8n editor locally at http://localhost:5678

## Additional Resources

- See the [CONTRIBUTING.md](https://github.com/n8n-io/n8n/blob/master/CONTRIBUTING.md) for more details on contributing and development.
- For help and support, visit the [community forum](https://community.n8n.io).

---

This document can be linked from the main README.md for better clarity on building the project.
