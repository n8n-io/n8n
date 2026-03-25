import { createMiddleware } from "../middleware.js";
import "../index.js";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod/v3";

//#region src/agents/middleware/todoListMiddleware.ts
/**
* Description for the write_todos tool
* Ported exactly from Python WRITE_TODOS_DESCRIPTION
*/
const WRITE_TODOS_DESCRIPTION = `Use this tool to create and manage a structured task list for your current work session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.
Only use this tool if you think it will be helpful in staying organized. If the user's request is trivial and takes less than 3 steps, it is better to NOT use this tool and just do the task directly.

## When to Use This Tool
Use this tool in these scenarios:

1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. The plan may need future revisions or updates based on results from the first few steps. Keeping track of this in a list is helpful.

## How to Use This Tool
1. When you start working on a task - Mark it as in_progress BEFORE beginning work.
2. After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation.
3. You can also update future tasks, such as deleting them if they are no longer necessary, or adding new tasks that are necessary. Don't change previously completed tasks.
4. You can make several updates to the todo list at once. For example, when you complete a task, you can mark the next task you need to start as in_progress.

## When NOT to Use This Tool
It is important to skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

## Examples of When to Use the Todo List

<example>
User: I want to add a dark mode toggle to the application settings. Make sure you run the tests and build when you're done!
Assistant: I'll help add a dark mode toggle to your application settings. Let me create a todo list to track this implementation.
*Creates todo list with the following items:*
1. Create dark mode toggle component in Settings page
2. Add dark mode state management (context/store)
3. Implement CSS-in-JS styles for dark theme
4. Update existing components to support theme switching
5. Run tests and build process, addressing any failures or errors that occur
*Begins working on the first task*

<reasoning>
The assistant used the todo list because:
1. Adding dark mode in it of itself is a multi-step feature requiring UI, state management, and styling changes
2. The assistant inferred that tests and build need to pass by adding "Ensure tests and build succeed" as the final task
3. Both of the user's requests are complex and require multiple steps to complete.
</reasoning>
</example>

<example>
User: Help me plan a comprehensive marketing campaign for our new product launch, including social media, email marketing, and press releases.
Assistant: I'll help you plan a comprehensive marketing campaign for your product launch. Let me create a todo list to organize all the components.
*Creates todo list with the following items:*
1. Define target audience and key messaging
2. Create social media content calendar and posting schedule
3. Design email marketing sequence and automation flows
4. Draft press release and identify media contacts
5. Set up tracking and analytics for campaign performance
6. Create visual assets and brand materials
7. Coordinate launch timeline and deliverables
*Begins working on the first task*

<reasoning>
The assistant used the todo list because:
1. Marketing campaign planning involves multiple distinct channels and activities
2. Each component requires careful coordination and planning
3. The systematic approach ensures all aspects of the launch are covered
</reasoning>
</example>

<example>
User: Help me rename the function getCwd to getCurrentWorkingDirectory across my project
Assistant: Let me first search through your codebase to find all occurrences of 'getCwd'.
*Uses search tools to locate all instances of getCwd in the codebase*
Assistant: I've found 15 instances of 'getCwd' across 8 different files. Let me create a todo list to track these changes.
*Creates todo list with specific items for each file that needs updating*

<reasoning>
The assistant used the todo list because:
1. The assistant searched to understand the scope of the task
2. Upon finding multiple occurrences across different files, it determined this was a complex task with multiple steps (>3)
3. The todo list helps ensure every instance is tracked and updated systematically
4. This approach prevents missing any occurrences and maintains consistency.
</reasoning>
</example>

<example>
User: I need help organizing my home office: decluttering the desk, setting up a filing system, organizing digital files, and creating a daily workflow.
Assistant: I'll help you organize your home office systematically. Let me create a todo list to track each area of organization.
*Creates todo list with items like: 1) Sort and declutter desk items, 2) Set up physical filing system for documents, 3) Organize digital files and folders, 4) Create daily workflow and productivity systems, 5) Establish maintenance routines*
Let's start with decluttering your desk space to create a clean foundation for the other organizational systems.

<reasoning>
The assistant used the todo list because:
1. The user provided multiple distinct organizational tasks
2. Each area requires different approaches and careful planning
3. Home organization benefits from systematic, step-by-step completion
4. Progress tracking ensures all areas are addressed thoroughly
</reasoning>
</example>

## Examples of When NOT to Use the Todo List

<example>
User: How do I print 'Hello World' in Python?
Assistant: In Python, you can print "Hello World" with this simple code:

\`\`\`python
print("Hello World")
\`\`\`

This will output the text "Hello World" to the console when executed.</assistant>

<reasoning>
The assistant did not use the todo list because this is a single, trivial task that can be completed in one step. There's no need to track multiple tasks or steps for such a straightforward request.
</reasoning>
</example>

<example>
User: What's the best way to water houseplants?
Assistant: The best way to water houseplants depends on the specific plant type, but here are some general guidelines:

- Check soil moisture by inserting your finger about 1-2 inches into the soil
- Water thoroughly when the top inch feels dry, allowing water to drain from the bottom
- Use room temperature water and water in the morning when possible
- Avoid overwatering, which is more harmful than underwatering for most plants

Different plants have different needs, so it's important to research your specific varieties for optimal care.

<reasoning>
The assistant did not use the todo list because this is an informational request with no actual tasks to complete. The user is simply asking for advice and explanation, not for the assistant to perform multiple steps or activities.
</reasoning>
</example>

<example>
User: Can you add a comment to the calculateTotal function to explain what it does?
Assistant: Sure, let me add a comment to the calculateTotal function to explain what it does.
* Uses the Edit tool to add a comment to the calculateTotal function *

<reasoning>
The assistant did not use the todo list because this is a single, straightforward task confined to one location. Adding a comment doesn't require tracking multiple steps or systematic organization.
</reasoning>
</example>

<example>
User: What time is it in Tokyo right now?
Assistant: I'll check the current time in Tokyo for you.

*Searches for current time in Tokyo*

The current time in Tokyo, Japan is [current time]. Tokyo is in the Japan Standard Time (JST) zone, which is UTC+9.

<reasoning>
The assistant did not use the todo list because this is a single information lookup with immediate results. There are no multiple steps to track or organize, making the todo list unnecessary for this straightforward request.
</reasoning>
</example>

<example>
User: I need to write a function that checks if a number is prime and then test it out.
Assistant: I'll help you write a function that checks if a number is prime and then test it out.
*Writes function that checks if a number is prime*
*Tests the function*

<reasoning>
Even though this is a multi-step task, it is very straightforward and can be completed in two trivial steps (which is less than 3 steps!). Using the todo list here is overkill and wastes time and tokens.
</reasoning>
</example>

<example>
User: I want you to order a pizza from Dominos, order a burger from McDonald's, and order a salad from Subway.
Assistant: I'll help you order a pizza from Dominos, order a burger from McDonald's, and order a salad from Subway.
*Orders a pizza from Dominos*
*Orders a burger from McDonald's*
*Orders a salad from Subway*

<reasoning>
Even though this is a multi-step task, assuming the assistant has the ability to order from these restaurants, it is very straightforward and can be completed in three trivial tool calls. 
Using the todo list here is overkill and wastes time and tokens. These three tool calls should be made in parallel, in fact.
</reasoning>
</example>


## Task States and Management

1. **Task States**: Use these states to track progress:
   - pending: Task not yet started
   - in_progress: Currently working on (you can have multiple tasks in_progress at a time if they are not related to each other and can be run in parallel)
   - completed: Task finished successfully

2. **Task Management**:
   - Update task status in real-time as you work
   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
   - Complete current tasks before starting new ones
   - Remove tasks that are no longer relevant from the list entirely
   - IMPORTANT: When you write this todo list, you should mark your first task (or tasks) as in_progress immediately!.
   - IMPORTANT: Unless all tasks are completed, you should always have at least one task in_progress to show the user that you are working on something.

3. **Task Completion Requirements**:
   - ONLY mark a task as completed when you have FULLY accomplished it
   - If you encounter errors, blockers, or cannot finish, keep the task as in_progress
   - When blocked, create a new task describing what needs to be resolved
   - Never mark a task as completed if:
     - There are unresolved issues or errors
     - Work is partial or incomplete
     - You encountered blockers that prevent completion
     - You couldn't find necessary resources or dependencies
     - Quality standards haven't been met

4. **Task Breakdown**:
   - Create specific, actionable items
   - Break complex tasks into smaller, manageable steps
   - Use clear, descriptive task names

Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully
Remember: If you only need to make a few tool calls to complete a task, and it is clear what you need to do, it is better to just do the task directly and NOT call this tool at all.`;
const TODO_LIST_MIDDLEWARE_SYSTEM_PROMPT = `## \`write_todos\`

You have access to the \`write_todos\` tool to help you manage and plan complex objectives. 
Use this tool for complex objectives to ensure that you are tracking each necessary step and giving the user visibility into your progress.
This tool is very helpful for planning complex objectives, and for breaking down these larger complex objectives into smaller steps.

It is critical that you mark todos as completed as soon as you are done with a step. Do not batch up multiple steps before marking them as completed.
For simple objectives that only require a few steps, it is better to just complete the objective directly and NOT use this tool.
Writing todos takes time and tokens, use it when it is helpful for managing complex many-step problems! But not for simple few-step requests.

## Important To-Do List Usage Notes to Remember
- The \`write_todos\` tool should never be called multiple times in parallel.
- Don't be afraid to revise the To-Do list as you go. New information may reveal new tasks that need to be done, or old tasks that are irrelevant.`;
const TodoStatus = z.enum([
	"pending",
	"in_progress",
	"completed"
]).describe("Status of the todo");
const TodoSchema = z.object({
	content: z.string().describe("Content of the todo item"),
	status: TodoStatus
});
const stateSchema = z.object({ todos: z.array(TodoSchema).default([]) });
/**
* Creates a middleware that provides todo list management capabilities to agents.
*
* This middleware adds a `write_todos` tool that allows agents to create and manage
* structured task lists for complex multi-step operations. It's designed to help
* agents track progress, organize complex tasks, and provide users with visibility
* into task completion status.
*
* The middleware automatically injects system prompts that guide the agent on when
* and how to use the todo functionality effectively. It also enforces that the
* `write_todos` tool is called at most once per model turn, since the tool replaces
* the entire todo list and parallel calls would create ambiguity about precedence.
*
* @example
* ```typescript
* import { todoListMiddleware, createAgent } from 'langchain';
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   middleware: [todoListMiddleware()],
* });
*
* // Agent now has access to write_todos tool and todo state tracking
* const result = await agent.invoke({
*   messages: [new HumanMessage("Help me refactor my codebase")]
* });
*
* console.log(result.todos); // Array of todo items with status tracking
* ```
*
* @returns A configured middleware instance that provides todo management capabilities
*
* @see {@link TodoMiddlewareState} for the state schema
* @see {@link writeTodos} for the tool implementation
*/
function todoListMiddleware(options) {
	/**
	* Write todos tool - manages todo list with Command return
	*/
	const writeTodos = tool(({ todos }, config) => {
		return new Command({ update: {
			todos,
			messages: [new ToolMessage({
				content: `Updated todo list to ${JSON.stringify(todos)}`,
				tool_call_id: config.toolCall?.id
			})]
		} });
	}, {
		name: "write_todos",
		description: options?.toolDescription ?? WRITE_TODOS_DESCRIPTION,
		schema: z.object({ todos: z.array(TodoSchema).describe("List of todo items to update") })
	});
	return createMiddleware({
		name: "todoListMiddleware",
		stateSchema,
		tools: [writeTodos],
		wrapModelCall: (request, handler) => handler({
			...request,
			systemMessage: request.systemMessage.concat(`\n\n${options?.systemPrompt ?? TODO_LIST_MIDDLEWARE_SYSTEM_PROMPT}`)
		}),
		afterModel: (state) => {
			/**
			* Check for parallel write_todos tool calls and return errors if detected.
			*
			* The todo list is designed to be updated at most once per model turn. Since
			* the `write_todos` tool replaces the entire todo list with each call, making
			* multiple parallel calls would create ambiguity about which update should take
			* precedence. This method prevents such conflicts by rejecting any response that
			* contains multiple write_todos tool calls.
			*/
			const messages = state.messages;
			if (!messages || messages.length === 0) return;
			/**
			* Find the last AI message
			*/
			const lastAiMsg = [...messages].reverse().find((msg) => AIMessage.isInstance(msg));
			if (!lastAiMsg || !lastAiMsg.tool_calls || lastAiMsg.tool_calls.length === 0) return;
			/**
			* Count write_todos tool calls
			*/
			const writeTodosCalls = lastAiMsg.tool_calls.filter((tc) => tc.name === writeTodos.name);
			if (writeTodosCalls.length > 1)
 /**
			* Keep the tool calls in the AI message but return error messages
			* This follows the same pattern as HumanInTheLoopMiddleware
			*/
			return { messages: writeTodosCalls.map((tc) => new ToolMessage({
				content: "Error: The `write_todos` tool should never be called multiple times in parallel. Please call it only once per model invocation to update the todo list.",
				tool_call_id: tc.id,
				status: "error"
			})) };
		}
	});
}

//#endregion
export { TODO_LIST_MIDDLEWARE_SYSTEM_PROMPT, todoListMiddleware };
//# sourceMappingURL=todoListMiddleware.js.map