import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import {
  ApiResponse,
  ExecuteActionParams,
  StagehandAPIConstructorParams,
  StartSessionParams,
  StartSessionResult,
} from "../types/api";
import { LogLine } from "../types/log";
import { GotoOptions } from "../types/playwright";
import {
  ActOptions,
  ActResult,
  ExtractOptions,
  ExtractResult,
  ObserveOptions,
  ObserveResult,
} from "../types/stagehand";

export class StagehandAPI {
  private apiKey: string;
  private projectId: string;
  private sessionId?: string;
  private logger: (message: LogLine) => void;

  constructor({ apiKey, projectId, logger }: StagehandAPIConstructorParams) {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.logger = logger;
  }

  async init({
    modelName,
    modelApiKey,
    domSettleTimeoutMs,
    verbose,
    debugDom,
    systemPrompt,
    browserbaseSessionCreateParams,
  }: StartSessionParams): Promise<StartSessionResult> {
    const whitelistResponse = await this.request("/healthcheck");

    if (whitelistResponse.status === 401) {
      throw new Error(
        "Unauthorized. Ensure you provided a valid API key and that it is whitelisted.",
      );
    } else if (whitelistResponse.status !== 200) {
      throw new Error(`Unknown error: ${whitelistResponse.status}`);
    }

    const sessionResponse = await this.request("/sessions/start", {
      method: "POST",
      body: JSON.stringify({
        modelName,
        domSettleTimeoutMs,
        verbose,
        debugDom,
        systemPrompt,
        browserbaseSessionCreateParams,
      }),
      headers: {
        "x-model-api-key": modelApiKey,
      },
    });

    if (sessionResponse.status !== 200) {
      console.log(await sessionResponse.text());
      throw new Error(`Unknown error: ${sessionResponse.status}`);
    }

    const sessionResponseBody =
      (await sessionResponse.json()) as ApiResponse<StartSessionResult>;

    if (sessionResponseBody.success === false) {
      throw new Error(sessionResponseBody.message);
    }

    this.sessionId = sessionResponseBody.data.sessionId;

    return sessionResponseBody.data;
  }

  async act(options: ActOptions): Promise<ActResult> {
    return this.execute<ActResult>({
      method: "act",
      args: { ...options },
    });
  }

  async extract<T extends z.AnyZodObject>(
    options: ExtractOptions<T>,
  ): Promise<ExtractResult<T>> {
    const parsedSchema = zodToJsonSchema(options.schema);
    return this.execute<ExtractResult<T>>({
      method: "extract",
      args: { ...options, schemaDefinition: parsedSchema },
    });
  }

  async observe(options?: ObserveOptions): Promise<ObserveResult[]> {
    return this.execute<ObserveResult[]>({
      method: "observe",
      args: { ...options },
    });
  }

  async goto(url: string, options?: GotoOptions): Promise<void> {
    return this.execute<void>({
      method: "navigate",
      args: { url, options },
    });
  }

  async end(): Promise<Response> {
    const url = `/sessions/${this.sessionId}/end`;
    return await this.request(url, {
      method: "POST",
    });
  }

  private async execute<T>({
    method,
    args,
    params,
  }: ExecuteActionParams): Promise<T> {
    const urlParams = new URLSearchParams(params as Record<string, string>);
    const queryString = urlParams.toString();
    const url = `/sessions/${this.sessionId}/${method}${queryString ? `?${queryString}` : ""}`;

    const response = await this.request(url, {
      method: "POST",
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done && !buffer) {
        return null;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        try {
          const eventData = JSON.parse(line.slice(6));

          if (eventData.type === "system") {
            if (eventData.data.status === "error") {
              throw new Error(eventData.data.error);
            }
            if (eventData.data.status === "finished") {
              return eventData.data.result as T;
            }
          } else if (eventData.type === "log") {
            this.logger(eventData.data.message);
          }
        } catch (e) {
          console.error("Error parsing event data:", e);
          throw new Error("Failed to parse server response");
        }
      }

      if (done) break;
    }
  }

  private async request(
    path: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const defaultHeaders: Record<string, string> = {
      "x-bb-api-key": this.apiKey,
      "x-bb-project-id": this.projectId,
      "x-bb-session-id": this.sessionId,
      // we want real-time logs, so we stream the response
      "x-stream-response": "true",
    };

    if (options.method === "POST" && options.body) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(`${process.env.STAGEHAND_API_URL}${path}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    return response;
  }
}
