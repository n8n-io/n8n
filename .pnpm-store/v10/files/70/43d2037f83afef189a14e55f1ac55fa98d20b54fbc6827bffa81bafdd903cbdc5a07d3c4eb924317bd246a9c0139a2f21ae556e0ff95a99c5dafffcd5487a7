export type LanguageModelV3ToolChoice =
  | { type: 'auto' } // the tool selection is automatic (can be no tool)
  | { type: 'none' } // no tool must be selected
  | { type: 'required' } // one of the available tools must be selected
  | { type: 'tool'; toolName: string }; // a specific tool must be selected:
