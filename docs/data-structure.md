# Data Structure

For "basic usage" it is not necessarily needed to understand how the data that
gets passed from one node to another is structured. However, it becomes important if you want to:

 - create your own node
 - write custom expressions
 - use the Function or Function Item node
 - you want to get the most out of n8n


In n8n, all the data that is passed between nodes is an array of objects. It has the following structure:

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
