export const CONNECTION_CHANGING_PARAMETERS = `Connection-changing parameters (affect node inputs/outputs):

Common connection-changing parameters:
- Vector Store: mode (insert/retrieve/retrieve-as-tool) — changes output type between main, ai_vectorStore, and ai_tool
- AI Agent: hasOutputParser (true/false) — enables ai_outputParser input
- Merge: numberInputs (default 2) — requires mode="append" OR mode="combine" + combineBy="combineByPosition"
- Switch: mode (expression/rules) — affects routing behavior

A parameter is connection-changing if it appears in node input/output expressions (patterns like $parameter.mode, $parameter.hasOutputParser).`;
