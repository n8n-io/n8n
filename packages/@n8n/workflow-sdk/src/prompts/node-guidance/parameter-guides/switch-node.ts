import type { NodeTypeGuide } from './types';

export const SWITCH_NODE_GUIDE: NodeTypeGuide = {
	patterns: ['n8n-nodes-base.switch'],
	content: `
### Switch Node Configuration Guide

The Switch node routes items to different outputs based on conditions. Uses the same filter structure as IF node but for multi-way branching.

#### Switch Node Structure (mode: 'rules')
\`\`\`json
{
  "mode": "rules",
  "rules": {
    "values": [
      {
        "conditions": {
          "options": {
            "caseSensitive": false,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "leftValue": "={{ $json.amount }}",
              "rightValue": 100,
              "operator": {
                "type": "number",
                "operation": "lt"
              }
            }
          ],
          "combinator": "and"
        },
        "renameOutput": true,
        "outputKey": "Under $100"
      }
    ]
  }
}
\`\`\`

#### Key Points:
1. **Default \`caseSensitive: false\` for string comparisons.** Real-world inputs vary in casing (\`"high"\` vs \`"High"\` vs \`"HIGH"\`). Only set \`caseSensitive: true\` when the user has explicitly said case matters — if you're not sure, ask them before guessing.
2. Each entry in rules.values[] creates ONE output
3. Conditions use the same filter structure as IF node
4. Multiple conditions per rule are combined with combinator ("and" or "or")
5. Use renameOutput: true + outputKey to label outputs descriptively

#### Numeric Operators
- lt: Less than
- gt: Greater than
- lte: Less than or equal
- gte: Greater than or equal
- equals: Equal to

#### String Operators
- equals: Exact match
- contains: Contains substring
- startsWith: Starts with
- endsWith: Ends with

#### Common Patterns:

**Numeric Range Routing** (for ranges like $100-$1000):
Use two conditions with combinator: "and":
- First condition: gte (greater than or equal to lower bound)
- Second condition: lte (less than or equal to upper bound)

**String-Based Routing** (status/type values):
- Use type: "string" with operation: "equals"
- Keep \`caseSensitive: false\` (the default above) unless the user explicitly asked for case-sensitive matching
`,
};
