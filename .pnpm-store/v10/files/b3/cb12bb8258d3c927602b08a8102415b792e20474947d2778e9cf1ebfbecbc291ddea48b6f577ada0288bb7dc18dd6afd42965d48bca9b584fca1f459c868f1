import { GoogleAuth } from "google-auth-library";
import { SDKOptions } from "../lib/config.js";
import { ClientSDK } from "../lib/sdks.js";
import { Chat } from "./chat";
import { Fim } from "./fim";
import { SDKHooks } from "../hooks";

export type GoogleCloudOptions = {
  /** The region of the Google Cloud AI Platform endpoint */
  region?: string;
  projectId?: string;
} | {
  /** The region of the Google Cloud AI Platform endpoint */
  region?: string;
  apiKey: () => Promise<string>;
  projectId: string;
}

const LEGACY_MODEL_ID_FORMAT: { [key: string]: string } = {
  "codestral-2405": "codestral@2405",
  "mistral-large-2407": "mistral-large@2407",
  "mistral-nemo-2407": "mistral-nemo@2407",
};

function getModelInfo(model: string): [string, string] {
  const modelId = LEGACY_MODEL_ID_FORMAT[model];
  if (modelId === undefined) {
    return [model, model];
  }
  model = model.split("-").slice(0, -1).join("-");
  return [model, modelId];
}

export class MistralGoogleCloud extends ClientSDK {
  constructor(options: SDKOptions & GoogleCloudOptions = {}) {
    let projectId = options.projectId ?? "";
    options.region = options.region ?? "europe-west4";
    options.serverURL = `https://${options.region}-aiplatform.googleapis.com`;
    if (options.apiKey) {
      if (!options.projectId) {
        throw new Error("if apiKey is provided, projectId must also be provided to be able to use the Google Cloud API");
      }
    } else {
      const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/cloud-platform",
      });
      options.apiKey = async () => {
        const authClient = await auth.getClient();
        const authHeaders = await authClient.getRequestHeaders();
        const token = authHeaders["Authorization"];
        if (!token) {
          throw new Error("failed to get Google Cloud API key from the default authorization provider, check you are authenticated");
        }

        if (!options.projectId) {
          if (!authHeaders["x-goog-user-project"]) {
            throw new Error(
              "no project id available in default google credentials. Please provide a project id in the input arguments to MistralGoogleCloud."
            );
          }
          projectId = authHeaders["x-goog-user-project"];
        }
        return token;
      }
    }

    const hooks = new SDKHooks();

    const superOptions: SDKOptions & { hooks?: SDKHooks } = options;
    superOptions.hooks = hooks;

    super(options)

    hooks.registerBeforeCreateRequestHook({
      beforeCreateRequest: (_, input) => {
        if (!projectId) {
          throw new Error("projectId was not resolved by the auth hook");
        }

        if (!input.options?.body) {
          throw new Error("Expected body");
        }

        let body: unknown = {};
        const bodyStream = input.options.body;
        if (bodyStream) {
          body = JSON.parse(bodyStream.toString());
        }

        if (typeof body !== "object" || !body) {
          throw new Error("Expected object body");
        }

        const rawPredictType = input.url.pathname.includes("streamRawPredict")
          ? "streamRawPredict"
          : "rawPredict";

        if (!("model" in body) || typeof body.model !== "string") {
          throw new Error("body.model is required and must be a string");
        }

        const [model, modelId] = getModelInfo(body.model);

        if (!model || !modelId) {
          throw new Error("model must be in the format 'model-version'");
        }

        input.url.pathname = `v1/projects/${projectId}/locations/${options.region}/publishers/mistralai/models/${modelId}:${rawPredictType}`;

        body.model = model

        input.options.body = JSON.stringify(body);

        return input;
      },
    });
  }

  private _chat?: Chat;
  get chat(): Chat {
    return (this._chat ??= new Chat(this._options));
  }


  private _fim?: Fim;
  get fim(): Fim {
    return (this._fim ??= new Fim(this._options));
  }
}
