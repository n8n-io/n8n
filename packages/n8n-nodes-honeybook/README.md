# Package for HB nodes 

## Installation
As a `turbo` package all the building & testing & running is taken care of.
install with:
`pnpm install` in base directory.
## Usage
To use this package and all its nodes to the local n8n instance you need to:
```bash
export N8N_CUSTOM_EXTENSIONS=<N8N_REPO_LOCATION_ON_LOCAL_COMPUTER>/packages/n8n-nodes-honeybook/dist
export N8N_COMMUNITY_PACKAGES_ENABLED=true
pnpm run dev # or pnpm run start if you already ran build
```

Note - This will already be baked in with our Dockerfile for the deployment side. 

### Adding packages
add any node definition in the `nodes` directory:

* `<name>.node.js` + `<name>.node.json` are required in a folder.
* add the dist location of the nodes to the `package.json` file under `"n8n"` [here](https://github.com/HoneyBook/n8n/blob/ddbe13d8b894d39b1d4975799d632eddf444692a/packages/n8n-nodes-honeybook/package.json#L22)