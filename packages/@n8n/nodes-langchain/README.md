![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-langchain

This repo contains nodes to use n8n in combination with [LangChain](https://langchain.com/).

## Development

### Native Dependencies

This package includes native dependencies (like `ibm_db`) that require compilation for your specific system. After installation or when switching Node.js versions, these dependencies are automatically rebuilt via the `postinstall` script.

If you encounter issues with native modules (e.g., "Could not locate the bindings file"), you can manually rebuild them:

```bash
# From the repository root
pnpm rebuild ibm_db

# Or directly in the package
cd packages/@n8n/nodes-langchain
npm rebuild ibm_db
```

**Note:** Native modules must be rebuilt when:
- Switching Node.js versions
- Pulling updates from git that modify dependencies
- Moving the project to a different machine or architecture

## License

You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
