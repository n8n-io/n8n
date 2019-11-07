# Data Structure

For "basic usage" it is not necessarily needed to understand how the data is structured
which gets passed from one node to another. It becomes however important if you want to:

 - create an own node
 - write custom expressions
 - use the Function or Function Item Node
 - you want to get the most out of n8n in general


In n8n all data passed between nodes is an array of objects. It has the structure below:

```json
[
	{
		// Each item has to contain a "json" property. But it can be an empty object like {}.
		// Any kind of JSON data is allowed. So arrays and the data being deeply nested is fine.
		json: { // The actual data n8n operates on (required)
			// This data is only an example it could be any kind of JSON data
			jsonKeyName: 'keyValue',
			anotherJsonKey: {
				lowerLevelJsonKey: 1
			}
		},
		// Binary data of item. The most items in n8n do not contain any (optional)
		binary: {
			// The key-name "binaryKeyName" is only an example. Any kind of key-name is possible.
			binaryKeyName: {
				data: '....', // Base64 encoded binary data (required)
				mimeType: 'image/png', // Optional but should be set if possible (optional)
				fileExtension: 'png', // Optional but should be set if possible (optional)
				fileName: 'example.png', // Optional but should be set if possible (optional)
			}
		}
	},
	...
]
```
