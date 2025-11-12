import { convertNodeToTypes } from './generateTypes';
import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

(async () => {
	// Load the nodes JSON file
	const nodesFilePath = path.join(__dirname, '..', 'tmp', 'nodes.json');
	const nodesFileContent = fs.readFileSync(nodesFilePath, 'utf-8');
	const nodeDefinitions = JSON.parse(nodesFileContent);

	// Convert each node definition to TypeScript types
	const typesOutput = await convertNodeToTypes(nodeDefinitions);

	// Output the generated types to a file
	const outputFilePath = path.join(__dirname, '..', 'tmp', 'generatedNodeTypes.ts');
	fs.writeFileSync(outputFilePath, typesOutput);
})();
