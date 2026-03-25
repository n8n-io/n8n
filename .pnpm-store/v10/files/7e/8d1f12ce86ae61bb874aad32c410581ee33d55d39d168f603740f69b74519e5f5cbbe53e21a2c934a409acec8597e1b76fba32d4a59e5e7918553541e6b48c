import { AgentMiddleware } from "./types.cjs";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod/v3";

//#region src/agents/middleware/todoListMiddleware.d.ts
declare const TODO_LIST_MIDDLEWARE_SYSTEM_PROMPT = "## `write_todos`\n\nYou have access to the `write_todos` tool to help you manage and plan complex objectives. \nUse this tool for complex objectives to ensure that you are tracking each necessary step and giving the user visibility into your progress.\nThis tool is very helpful for planning complex objectives, and for breaking down these larger complex objectives into smaller steps.\n\nIt is critical that you mark todos as completed as soon as you are done with a step. Do not batch up multiple steps before marking them as completed.\nFor simple objectives that only require a few steps, it is better to just complete the objective directly and NOT use this tool.\nWriting todos takes time and tokens, use it when it is helpful for managing complex many-step problems! But not for simple few-step requests.\n\n## Important To-Do List Usage Notes to Remember\n- The `write_todos` tool should never be called multiple times in parallel.\n- Don't be afraid to revise the To-Do list as you go. New information may reveal new tasks that need to be done, or old tasks that are irrelevant.";
interface TodoListMiddlewareOptions {
  /**
   * Custom system prompt to guide the agent on using the todo tool.
   * If not provided, uses the default {@link PLANNING_MIDDLEWARE_SYSTEM_PROMPT}.
   */
  systemPrompt?: string;
  /**
   * Custom description for the {@link writeTodos} tool.
   * If not provided, uses the default {@link WRITE_TODOS_DESCRIPTION}.
   */
  toolDescription?: string;
}
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
declare function todoListMiddleware(options?: TodoListMiddlewareOptions): AgentMiddleware<z.ZodObject<{
  todos: z.ZodDefault<z.ZodArray<z.ZodObject<{
    content: z.ZodString;
    status: z.ZodEnum<["pending", "in_progress", "completed"]>;
  }, "strip", z.ZodTypeAny, {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }, {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }>, "many">>;
}, "strip", z.ZodTypeAny, {
  todos: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[];
}, {
  todos?: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[] | undefined;
}>, undefined, unknown, readonly [_langchain_core_tools0.DynamicStructuredTool<z.ZodObject<{
  todos: z.ZodArray<z.ZodObject<{
    content: z.ZodString;
    status: z.ZodEnum<["pending", "in_progress", "completed"]>;
  }, "strip", z.ZodTypeAny, {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }, {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }>, "many">;
}, "strip", z.ZodTypeAny, {
  todos: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[];
}, {
  todos: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[];
}>, {
  todos: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[];
}, {
  todos: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[];
}, Command<unknown, {
  todos: {
    content: string;
    status: "completed" | "in_progress" | "pending";
  }[];
  messages: ToolMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>>[];
}, string>, "write_todos">]>;
//#endregion
export { TODO_LIST_MIDDLEWARE_SYSTEM_PROMPT, TodoListMiddlewareOptions, todoListMiddleware };
//# sourceMappingURL=todoListMiddleware.d.cts.map