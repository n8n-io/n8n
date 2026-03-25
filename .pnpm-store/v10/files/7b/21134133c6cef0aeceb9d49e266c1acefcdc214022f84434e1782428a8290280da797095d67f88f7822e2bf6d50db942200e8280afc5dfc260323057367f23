import { LLMTool } from "../types/llm";
import { ChatMessage } from "./llm/LLMClient";

// act
const actSystemPrompt = `
# Instructions
You are a browser automation assistant. Your job is to accomplish the user's goal across multiple model calls by running playwright commands.

## Input
You will receive:
1. the user's overall goal
2. the steps that you've taken so far
3. a list of active DOM elements in this chunk to consider to get closer to the goal. 
4. Optionally, a list of variable names that the user has provided that you may use to accomplish the goal. To use the variables, you must use the special <|VARIABLE_NAME|> syntax.
5. Optionally, custom instructions will be provided by the user. If the user's instructions are not relevant to the current task, ignore them. Otherwise, make sure to adhere to them.


## Your Goal / Specification
You have 2 tools that you can call: doAction, and skipSection. Do action only performs Playwright actions. Do exactly what the user's goal is. Do not perform any other actions or exceed the scope of the goal.
If the user's goal will be accomplished after running the playwright action, set completed to true. Better to have completed set to true if your are not sure.

Note 1: If there is a popup on the page for cookies or advertising that has nothing to do with the goal, try to close it first before proceeding. As this can block the goal from being completed.
Note 2: Sometimes what your are looking for is hidden behind and element you need to interact with. For example, sliders, buttons, etc...

Again, if the user's goal will be accomplished after running the playwright action, set completed to true. Also, if the user provides custom instructions, it is imperative that you follow them no matter what.
`;

const verifyActCompletionSystemPrompt = `
You are a browser automation assistant. The job has given you a goal and a list of steps that have been taken so far. Your job is to determine if the user's goal has been completed based on the provided information.

# Input
You will receive:
1. The user's goal: A clear description of what the user wants to achieve.
2. Steps taken so far: A list of actions that have been performed up to this point.

# Your Task
Analyze the provided information to determine if the user's goal has been fully completed.

# Output
Return a boolean value:
- true: If the goal has been definitively completed based on the steps taken and the current page.
- false: If the goal has not been completed or if there's any uncertainty about its completion.

# Important Considerations
- False positives are okay. False negatives are not okay.
- Look for evidence of errors on the page or something having gone wrong in completing the goal. If one does not exist, return true.
`;

// ## Examples for completion check
// ### Example 1
// 1. User's goal: "input data scientist into role"
// 2. Steps you've taken so far: "The role input field was filled with 'data scientist'."
// 3. Active DOM elements: ["<input id="c9" class="VfPpkd-fmcmS-wGMbrd " aria-expanded="false" data-axe="mdc-autocomplete">data scientist</input>", "<button class="VfPpkd-LgbsSe VfPpkd-LgbsSe-OWXEXe-INsAgc lJ9FBc nDgy9d" type="submit">Search</button>"]

// Output: Will need to have completed set to true. Nothing else matters.
// Reasoning: The goal the user set has already been accomplished. We should not take any extra actions outside of the scope of the goal (for example, clicking on the search button is an invalid action - ie: not acceptable).

// ### Example 2
// 1. User's goal: "Sign up for the newsletter"
// 2. Steps you've taken so far: ["The email input field was filled with 'test@test.com'."]
// 3. Active DOM elements: ["<input type='email' id='newsletter-email' placeholder='Enter your email'></input>", "<button id='subscribe-button'>Subscribe</button>"]

// Output: Will need to have click on the subscribe button as action. And completed set to false.
// Reasoning: There might be an error when trying to submit the form and you need to make sure the goal is accomplished properly. So you set completed to false.

export function buildVerifyActCompletionSystemPrompt(): ChatMessage {
  return {
    role: "system",
    content: verifyActCompletionSystemPrompt,
  };
}

export function buildVerifyActCompletionUserPrompt(
  goal: string,
  steps = "None",
  domElements: string | undefined,
): ChatMessage {
  let actUserPrompt = `
# My Goal
${goal}

# Steps You've Taken So Far
${steps}
`;

  if (domElements) {
    actUserPrompt += `
# Active DOM Elements on the current page
${domElements}
`;
  }

  return {
    role: "user",
    content: actUserPrompt,
  };
}

export function buildUserInstructionsString(
  userProvidedInstructions?: string,
): string {
  if (!userProvidedInstructions) {
    return "";
  }

  return `\n\n# Custom Instructions Provided by the User
    
Please keep the user's instructions in mind when performing actions. If the user's instructions are not relevant to the current task, ignore them.

User Instructions:
${userProvidedInstructions}`;
}

export function buildActSystemPrompt(
  userProvidedInstructions?: string,
): ChatMessage {
  return {
    role: "system",
    content: [
      actSystemPrompt,
      buildUserInstructionsString(userProvidedInstructions),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export function buildActUserPrompt(
  action: string,
  steps = "None",
  domElements: string,
  variables?: Record<string, string>,
): ChatMessage {
  let actUserPrompt = `
# My Goal
${action}

# Steps You've Taken So Far
${steps}

# Current Active Dom Elements
${domElements}
`;

  if (variables && Object.keys(variables).length > 0) {
    actUserPrompt += `
# Variables
${Object.keys(variables)
  .map((key) => `<|${key.toUpperCase()}|>`)
  .join("\n")}
`;
  }

  return {
    role: "user",
    content: actUserPrompt,
  };
}

export const actTools: LLMTool[] = [
  {
    type: "function",
    name: "doAction",
    description:
      "execute the next playwright step that directly accomplishes the goal",
    parameters: {
      type: "object",
      required: ["method", "element", "args", "step", "completed"],
      properties: {
        method: {
          type: "string",
          description: "The playwright function to call.",
        },
        element: {
          type: "number",
          description: "The element number to act on",
        },
        args: {
          type: "array",
          description: "The required arguments",
          items: {
            type: "string",
            description: "The argument to pass to the function",
          },
        },
        step: {
          type: "string",
          description:
            "human readable description of the step that is taken in the past tense. Please be very detailed.",
        },
        why: {
          type: "string",
          description: "why is this step taken? how does it advance the goal?",
        },
        completed: {
          type: "boolean",
          description:
            "true if the goal should be accomplished after this step",
        },
      },
    },
  },
  {
    type: "function",
    name: "skipSection",
    description:
      "skips this area of the webpage because the current goal cannot be accomplished here",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "reason that no action is taken",
        },
      },
    },
  },
];

// extract
export function buildExtractSystemPrompt(
  isUsingPrintExtractedDataTool: boolean = false,
  useTextExtract: boolean = true,
  userProvidedInstructions?: string,
): ChatMessage {
  const baseContent = `You are extracting content on behalf of a user.
  If a user asks you to extract a 'list' of information, or 'all' information, 
  YOU MUST EXTRACT ALL OF THE INFORMATION THAT THE USER REQUESTS.
   
  You will be given:
1. An instruction
2. `;

  const contentDetail = useTextExtract
    ? `A text representation of a webpage to extract information from.`
    : `A list of DOM elements to extract from.`;

  const instructions = `
Print the exact text from the ${
    useTextExtract ? "text-rendered webpage" : "DOM elements"
  } with all symbols, characters, and endlines as is.
Print null or an empty string if no new information is found.
  `.trim();

  const toolInstructions = isUsingPrintExtractedDataTool
    ? `
ONLY print the content using the print_extracted_data tool provided.
ONLY print the content using the print_extracted_data tool provided.
  `.trim()
    : "";

  const additionalInstructions = useTextExtract
    ? `Once you are given the text-rendered webpage, 
    you must thoroughly and meticulously analyze it. Be very careful to ensure that you
    do not miss any important information.`
    : "";

  const userInstructions = buildUserInstructionsString(
    userProvidedInstructions,
  );

  const content =
    `${baseContent}${contentDetail}\n\n${instructions}\n${toolInstructions}${
      additionalInstructions ? `\n\n${additionalInstructions}` : ""
    }${userInstructions ? `\n\n${userInstructions}` : ""}`.replace(/\s+/g, " ");

  return {
    role: "system",
    content,
  };
}

export function buildExtractUserPrompt(
  instruction: string,
  domElements: string,
  isUsingPrintExtractedDataTool: boolean = false,
): ChatMessage {
  let content = `Instruction: ${instruction}
DOM: ${domElements}`;

  if (isUsingPrintExtractedDataTool) {
    content += `
ONLY print the content using the print_extracted_data tool provided.
ONLY print the content using the print_extracted_data tool provided.`;
  }

  return {
    role: "user",
    content,
  };
}

const refineSystemPrompt = `You are tasked with refining and filtering information for the final output based on newly extracted and previously extracted content. Your responsibilities are:
1. Remove exact duplicates for elements in arrays and objects.
2. For text fields, append or update relevant text if the new content is an extension, replacement, or continuation.
3. For non-text fields (e.g., numbers, booleans), update with new values if they differ.
4. Add any completely new fields or objects ONLY IF they correspond to the provided schema.

Return the updated content that includes both the previous content and the new, non-duplicate, or extended information.`;

export function buildRefineSystemPrompt(): ChatMessage {
  return {
    role: "system",
    content: refineSystemPrompt,
  };
}

export function buildRefineUserPrompt(
  instruction: string,
  previouslyExtractedContent: object,
  newlyExtractedContent: object,
): ChatMessage {
  return {
    role: "user",
    content: `Instruction: ${instruction}
Previously extracted content: ${JSON.stringify(previouslyExtractedContent, null, 2)}
Newly extracted content: ${JSON.stringify(newlyExtractedContent, null, 2)}
Refined content:`,
  };
}

const metadataSystemPrompt = `You are an AI assistant tasked with evaluating the progress and completion status of an extraction task.
Analyze the extraction response and determine if the task is completed or if more information is needed.

Strictly abide by the following criteria:
1. Once the instruction has been satisfied by the current extraction response, ALWAYS set completion status to true and stop processing, regardless of remaining chunks.
2. Only set completion status to false if BOTH of these conditions are true:
   - The instruction has not been satisfied yet
   - There are still chunks left to process (chunksTotal > chunksSeen)`;

export function buildMetadataSystemPrompt(): ChatMessage {
  return {
    role: "system",
    content: metadataSystemPrompt,
  };
}

export function buildMetadataPrompt(
  instruction: string,
  extractionResponse: object,
  chunksSeen: number,
  chunksTotal: number,
): ChatMessage {
  return {
    role: "user",
    content: `Instruction: ${instruction}
Extracted content: ${JSON.stringify(extractionResponse, null, 2)}
chunksSeen: ${chunksSeen}
chunksTotal: ${chunksTotal}`,
  };
}

// observe
export function buildObserveSystemPrompt(
  userProvidedInstructions?: string,
  isUsingAccessibilityTree = false,
): ChatMessage {
  const observeSystemPrompt = `
You are helping the user automate the browser by finding elements based on what the user wants to observe in the page.

You will be given:
1. a instruction of elements to observe
2. ${
    isUsingAccessibilityTree
      ? "a hierarchical accessibility tree showing the semantic structure of the page. The tree is a hybrid of the DOM and the accessibility tree."
      : "a numbered list of possible elements"
  }

Return an array of elements that match the instruction if they exist, otherwise return an empty array.`;
  const content = observeSystemPrompt.replace(/\s+/g, " ");

  return {
    role: "system",
    content: [content, buildUserInstructionsString(userProvidedInstructions)]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export function buildObserveUserMessage(
  instruction: string,
  domElements: string,
  isUsingAccessibilityTree = false,
): ChatMessage {
  return {
    role: "user",
    content: `instruction: ${instruction}
${isUsingAccessibilityTree ? "Accessibility Tree" : "DOM"}: ${domElements}`,
  };
}

/**
 * Builds the instruction for the observeAct method to find the most relevant element for an action
 */
export function buildActObservePrompt(
  action: string,
  supportedActions: string[],
  variables?: Record<string, string>,
): string {
  // Base instruction
  let instruction = `Find the most relevant element to perform an action on given the following action: ${action}. 
  Provide an action for this element such as ${supportedActions.join(", ")}, or any other playwright locator method. Remember that to users, buttons and links look the same in most cases.
  If the action is completely unrelated to a potential action to be taken on the page, return an empty array. 
  ONLY return one action. If multiple actions are relevant, return the most relevant one.`;

  // Add variable names (not values) to the instruction if any
  if (variables && Object.keys(variables).length > 0) {
    const variablesPrompt = `The following variables are available to use in the action: ${Object.keys(variables).join(", ")}. Fill the argument variables with the variable name.`;
    instruction += ` ${variablesPrompt}`;
  }

  return instruction;
}
