import type { NodeTypeGuide } from '../types';

export const SPLIT_IN_BATCHES_GUIDE: NodeTypeGuide = {
	patterns: ['n8n-nodes-base.splitInBatches', 'splitInBatches'],
	content: `
### Loop Over Items (Split in Batches) Node Configuration Guide

The Loop Over Items node (splitInBatches) is used to process items in batches by looping through them.

#### Critical Parameter Guidance

**DO NOT set the "reset" parameter** - This is an advanced parameter that is rarely needed in normal workflows. The reset parameter forces the loop to restart from the beginning of the input items, which is only useful in very specific edge cases.

#### Basic Configuration

Only configure these parameters:
- **batchSize**: Number of items to process in each batch iteration (default: 1)

Example configuration:
\`\`\`json
{
  "batchSize": 10
}
\`\`\`
`,
};
