"use strict";
/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectLocationGithub = exports.DocumentExtractionObjectLocation = exports.ContentLocation = exports.ModelResourceEntity = exports.TaxonomyStatus = exports.SyntheticDataGenerationStatus = exports.SyntheticDataGenerationDataReference = exports.DocumentExtractionStatus = exports.FineTuningPeftParameters = exports.FineTuningEntity = exports.TextChatUserContentsTextChatUserTextContent = exports.TextChatUserContentsTextChatUserImageURLContent = exports.TextChatMessagesTextChatMessageUser = exports.TextChatMessagesTextChatMessageTool = exports.TextChatMessagesTextChatMessageSystem = exports.TextChatMessagesTextChatMessageAssistant = exports.WxPromptSessionEntry = exports.WxPromptResponse = exports.PromptLock = exports.ChatItem = exports.TrainingStatus = exports.TextGenResponseFieldsResultsItem = exports.TextGenParameters = exports.TextExtractionResults = exports.TextExtractionDataReference = exports.TextChatToolChoiceTool = exports.TextChatResultChoiceStream = exports.TextChatResultChoice = exports.TextChatResponseFormat = exports.TextChatParameterTools = exports.PromptTuning = exports.ObjectLocation = exports.LifeCycleState = exports.JsonPatchOperation = exports.HardwareRequest = exports.FoundationModel = exports.DeploymentTextGenProperties = exports.DeploymentStatus = exports.DeploymentEntity = exports.DataConnectionReference = exports.ApiErrorTarget = exports.CreateFineTuningConstants = exports.TrainingsListConstants = exports.TextChatStreamConstants = exports.TextChatConstants = exports.PutPromptSessionLockConstants = exports.PostPromptSessionEntryConstants = exports.PutPromptLockConstants = exports.PatchPromptConstants = exports.PostPromptConstants = void 0;
exports.TextClassificationSemanticConfig = exports.TextClassificationResults = exports.TextClassificationParameters = exports.TextClassificationDataReference = void 0;
/** Constants for the `postPrompt` operation. */
var PostPromptConstants;
(function (PostPromptConstants) {
    /** Input mode in use for the prompt. */
    let InputMode;
    (function (InputMode) {
        InputMode["STRUCTURED"] = "structured";
        InputMode["FREEFORM"] = "freeform";
        InputMode["CHAT"] = "chat";
        InputMode["DETACHED"] = "detached";
    })(InputMode = PostPromptConstants.InputMode || (PostPromptConstants.InputMode = {}));
})(PostPromptConstants = exports.PostPromptConstants || (exports.PostPromptConstants = {}));
/** Constants for the `patchPrompt` operation. */
var PatchPromptConstants;
(function (PatchPromptConstants) {
    /** Input mode in use for the prompt. */
    let InputMode;
    (function (InputMode) {
        InputMode["STRUCTURED"] = "structured";
        InputMode["FREEFORM"] = "freeform";
    })(InputMode = PatchPromptConstants.InputMode || (PatchPromptConstants.InputMode = {}));
})(PatchPromptConstants = exports.PatchPromptConstants || (exports.PatchPromptConstants = {}));
/** Constants for the `putPromptLock` operation. */
var PutPromptLockConstants;
(function (PutPromptLockConstants) {
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
     */
    let LockType;
    (function (LockType) {
        LockType["EDIT"] = "edit";
        LockType["GOVERNANCE"] = "governance";
    })(LockType = PutPromptLockConstants.LockType || (PutPromptLockConstants.LockType = {}));
})(PutPromptLockConstants = exports.PutPromptLockConstants || (exports.PutPromptLockConstants = {}));
/** Constants for the `postPromptSessionEntry` operation. */
var PostPromptSessionEntryConstants;
(function (PostPromptSessionEntryConstants) {
    /** Input mode in use for the prompt. */
    let InputMode;
    (function (InputMode) {
        InputMode["STRUCTURED"] = "structured";
        InputMode["FREEFORM"] = "freeform";
        InputMode["CHAT"] = "chat";
    })(InputMode = PostPromptSessionEntryConstants.InputMode || (PostPromptSessionEntryConstants.InputMode = {}));
})(PostPromptSessionEntryConstants = exports.PostPromptSessionEntryConstants || (exports.PostPromptSessionEntryConstants = {}));
/** Constants for the `putPromptSessionLock` operation. */
var PutPromptSessionLockConstants;
(function (PutPromptSessionLockConstants) {
    /**
     * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in PUT
     * /lock requests.
     */
    let LockType;
    (function (LockType) {
        LockType["EDIT"] = "edit";
        LockType["GOVERNANCE"] = "governance";
    })(LockType = PutPromptSessionLockConstants.LockType || (PutPromptSessionLockConstants.LockType = {}));
})(PutPromptSessionLockConstants = exports.PutPromptSessionLockConstants || (exports.PutPromptSessionLockConstants = {}));
/** Constants for the `textChat` operation. */
var TextChatConstants;
(function (TextChatConstants) {
    /**
     * Using `none` means the model will not call any tool and instead generates a message. **The
     * following options (`auto` and `required`) are not yet supported.** Using `auto` means the model
     * can pick between generating a message or calling one or more tools. Using `required` means the
     * model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be
     * present.
     */
    let ToolChoiceOption;
    (function (ToolChoiceOption) {
        ToolChoiceOption["NONE"] = "none";
        ToolChoiceOption["AUTO"] = "auto";
        ToolChoiceOption["REQUIRED"] = "required";
    })(ToolChoiceOption = TextChatConstants.ToolChoiceOption || (TextChatConstants.ToolChoiceOption = {}));
})(TextChatConstants = exports.TextChatConstants || (exports.TextChatConstants = {}));
/** Constants for the `textChatStream` operation. */
var TextChatStreamConstants;
(function (TextChatStreamConstants) {
    /**
     * Using `none` means the model will not call any tool and instead generates a message. **The
     * following options (`auto` and `required`) are not yet supported.** Using `auto` means the model
     * can pick between generating a message or calling one or more tools. Using `required` means the
     * model must call one or more tools. Only one of `tool_choice_option` or `tool_choice` must be
     * present.
     */
    let ToolChoiceOption;
    (function (ToolChoiceOption) {
        ToolChoiceOption["NONE"] = "none";
        ToolChoiceOption["AUTO"] = "auto";
        ToolChoiceOption["REQUIRED"] = "required";
    })(ToolChoiceOption = TextChatStreamConstants.ToolChoiceOption || (TextChatStreamConstants.ToolChoiceOption = {}));
})(TextChatStreamConstants = exports.TextChatStreamConstants || (exports.TextChatStreamConstants = {}));
/** Constants for the `trainingsList` operation. */
var TrainingsListConstants;
(function (TrainingsListConstants) {
    /** Filter based on on the training job state. */
    let State;
    (function (State) {
        State["QUEUED"] = "queued";
        State["PENDING"] = "pending";
        State["RUNNING"] = "running";
        State["STORING"] = "storing";
        State["COMPLETED"] = "completed";
        State["FAILED"] = "failed";
        State["CANCELED"] = "canceled";
    })(State = TrainingsListConstants.State || (TrainingsListConstants.State = {}));
})(TrainingsListConstants = exports.TrainingsListConstants || (exports.TrainingsListConstants = {}));
/** Constants for the `createFineTuning` operation. */
var CreateFineTuningConstants;
(function (CreateFineTuningConstants) {
    /** The `type` of Fine Tuning training. The `type` is set to `ilab` for InstructLab training. */
    let Type;
    (function (Type) {
        Type["ILAB"] = "ilab";
    })(Type = CreateFineTuningConstants.Type || (CreateFineTuningConstants.Type = {}));
})(CreateFineTuningConstants = exports.CreateFineTuningConstants || (exports.CreateFineTuningConstants = {}));
var ApiErrorTarget;
(function (ApiErrorTarget) {
    let Constants;
    (function (Constants) {
        /** The type of the problematic field. */
        let Type;
        (function (Type) {
            Type["FIELD"] = "field";
            Type["PARAMETER"] = "parameter";
            Type["HEADER"] = "header";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = ApiErrorTarget.Constants || (ApiErrorTarget.Constants = {}));
})(ApiErrorTarget = exports.ApiErrorTarget || (exports.ApiErrorTarget = {}));
var DataConnectionReference;
(function (DataConnectionReference) {
    let Constants;
    (function (Constants) {
        /**
         * The data source type like `connection_asset` or `data_asset`. If the data connection contains
         * just a schema then this field is not required.
         */
        let Type;
        (function (Type) {
            Type["CONNECTION_ASSET"] = "connection_asset";
            Type["DATA_ASSET"] = "data_asset";
            Type["CONTAINER"] = "container";
            Type["URL"] = "url";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = DataConnectionReference.Constants || (DataConnectionReference.Constants = {}));
})(DataConnectionReference = exports.DataConnectionReference || (exports.DataConnectionReference = {}));
var DeploymentEntity;
(function (DeploymentEntity) {
    let Constants;
    (function (Constants) {
        /**
         * The type of the deployed model. The possible values are the following: 1. `prompt_tune` -
         * when a prompt tuned model is deployed. 2. `foundation_model` - when a prompt template is used
         * on a pre-deployed IBM provided model. 3. `custom_foundation_model` - when a custom foundation
         * model is deployed.
         */
        let DeployedAssetType;
        (function (DeployedAssetType) {
            DeployedAssetType["PROMPT_TUNE"] = "prompt_tune";
            DeployedAssetType["FOUNDATION_MODEL"] = "foundation_model";
            DeployedAssetType["CUSTOM_FOUNDATION_MODEL"] = "custom_foundation_model";
        })(DeployedAssetType = Constants.DeployedAssetType || (Constants.DeployedAssetType = {}));
    })(Constants = DeploymentEntity.Constants || (DeploymentEntity.Constants = {}));
})(DeploymentEntity = exports.DeploymentEntity || (exports.DeploymentEntity = {}));
var DeploymentStatus;
(function (DeploymentStatus) {
    let Constants;
    (function (Constants) {
        /** Specifies the current state of the deployment. */
        let State;
        (function (State) {
            State["INITIALIZING"] = "initializing";
            State["UPDATING"] = "updating";
            State["READY"] = "ready";
            State["FAILED"] = "failed";
        })(State = Constants.State || (Constants.State = {}));
    })(Constants = DeploymentStatus.Constants || (DeploymentStatus.Constants = {}));
})(DeploymentStatus = exports.DeploymentStatus || (exports.DeploymentStatus = {}));
var DeploymentTextGenProperties;
(function (DeploymentTextGenProperties) {
    let Constants;
    (function (Constants) {
        /**
         * Represents the strategy used for picking the tokens during generation of the output text.
         * During text generation when parameter value is set to greedy, each successive token
         * corresponds to the highest probability token given the text that has already been generated.
         * This strategy can lead to repetitive results especially for longer output sequences. The
         * alternative sample strategy generates text by picking subsequent tokens based on the
         * probability distribution of possible next tokens defined by (i.e., conditioned on) the
         * already-generated text and the top_k and top_p parameters described below. See this
         * [url](https://huggingface.co/blog/how-to-generate) for an informative article about text
         * generation.
         */
        let DecodingMethod;
        (function (DecodingMethod) {
            DecodingMethod["SAMPLE"] = "sample";
            DecodingMethod["GREEDY"] = "greedy";
        })(DecodingMethod = Constants.DecodingMethod || (Constants.DecodingMethod = {}));
    })(Constants = DeploymentTextGenProperties.Constants || (DeploymentTextGenProperties.Constants = {}));
})(DeploymentTextGenProperties = exports.DeploymentTextGenProperties || (exports.DeploymentTextGenProperties = {}));
var FoundationModel;
(function (FoundationModel) {
    let Constants;
    (function (Constants) {
        /**
         * The tier of the model, depending on the `tier` the billing will be different, refer to the
         * plan for the details. Note that input tokens and output tokens may be charged differently.
         */
        let InputTier;
        (function (InputTier) {
            InputTier["CLASS_1"] = "class_1";
            InputTier["CLASS_2"] = "class_2";
            InputTier["CLASS_3"] = "class_3";
            InputTier["CLASS_C1"] = "class_c1";
        })(InputTier = Constants.InputTier || (Constants.InputTier = {}));
        /**
         * The tier of the model, depending on the `tier` the billing will be different, refer to the
         * plan for the details. Note that input tokens and output tokens may be charged differently.
         */
        let OutputTier;
        (function (OutputTier) {
            OutputTier["CLASS_1"] = "class_1";
            OutputTier["CLASS_2"] = "class_2";
            OutputTier["CLASS_3"] = "class_3";
            OutputTier["CLASS_C1"] = "class_c1";
        })(OutputTier = Constants.OutputTier || (Constants.OutputTier = {}));
    })(Constants = FoundationModel.Constants || (FoundationModel.Constants = {}));
})(FoundationModel = exports.FoundationModel || (exports.FoundationModel = {}));
var HardwareRequest;
(function (HardwareRequest) {
    let Constants;
    (function (Constants) {
        /** The size of GPU requested for the deployment. */
        let Size;
        (function (Size) {
            Size["GPU_S"] = "gpu_s";
            Size["GPU_M"] = "gpu_m";
            Size["GPU_L"] = "gpu_l";
        })(Size = Constants.Size || (Constants.Size = {}));
    })(Constants = HardwareRequest.Constants || (HardwareRequest.Constants = {}));
})(HardwareRequest = exports.HardwareRequest || (exports.HardwareRequest = {}));
var JsonPatchOperation;
(function (JsonPatchOperation) {
    let Constants;
    (function (Constants) {
        /** The operation to be performed. */
        let Op;
        (function (Op) {
            Op["ADD"] = "add";
            Op["REMOVE"] = "remove";
            Op["REPLACE"] = "replace";
            Op["MOVE"] = "move";
            Op["COPY"] = "copy";
            Op["TEST"] = "test";
        })(Op = Constants.Op || (Constants.Op = {}));
    })(Constants = JsonPatchOperation.Constants || (JsonPatchOperation.Constants = {}));
})(JsonPatchOperation = exports.JsonPatchOperation || (exports.JsonPatchOperation = {}));
var LifeCycleState;
(function (LifeCycleState) {
    let Constants;
    (function (Constants) {
        /**
         * The possible lifecycle stages, in order, are described below:
         *
         * - `available`: this means that the model is available for use.
         * - `deprecated`: this means that the model is still available but the model will be removed
         *   soon, so an alternative model should be used. - `constricted`: this means that the model is
         *   still available for inferencing but cannot be used for training or in a deployment. The
         *   model will be removed soon so an alternative model should be used.
         * - `withdrawn`: this means that the model is no longer available, check the
         *   `alternative_model_ids` to see what it can be replaced by.
         */
        let Id;
        (function (Id) {
            Id["AVAILABLE"] = "available";
            Id["DEPRECATED"] = "deprecated";
            Id["CONSTRICTED"] = "constricted";
            Id["WITHDRAWN"] = "withdrawn";
        })(Id = Constants.Id || (Constants.Id = {}));
    })(Constants = LifeCycleState.Constants || (LifeCycleState.Constants = {}));
})(LifeCycleState = exports.LifeCycleState || (exports.LifeCycleState = {}));
var ObjectLocation;
(function (ObjectLocation) {
    let Constants;
    (function (Constants) {
        /** The data source type like `connection_asset` or `data_asset`. */
        let Type;
        (function (Type) {
            Type["CONNECTION_ASSET"] = "connection_asset";
            Type["DATA_ASSET"] = "data_asset";
            Type["CONTAINER"] = "container";
            Type["URL"] = "url";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = ObjectLocation.Constants || (ObjectLocation.Constants = {}));
})(ObjectLocation = exports.ObjectLocation || (exports.ObjectLocation = {}));
var PromptTuning;
(function (PromptTuning) {
    let Constants;
    (function (Constants) {
        /** Type of Peft (Parameter-Efficient Fine-Tuning) config to build. */
        let TuningType;
        (function (TuningType) {
            TuningType["PROMPT_TUNING"] = "prompt_tuning";
        })(TuningType = Constants.TuningType || (Constants.TuningType = {}));
        /** The `text` method requires `init_text` to be set. */
        let InitMethod;
        (function (InitMethod) {
            InitMethod["RANDOM"] = "random";
            InitMethod["TEXT"] = "text";
        })(InitMethod = Constants.InitMethod || (Constants.InitMethod = {}));
    })(Constants = PromptTuning.Constants || (PromptTuning.Constants = {}));
})(PromptTuning = exports.PromptTuning || (exports.PromptTuning = {}));
var TextChatParameterTools;
(function (TextChatParameterTools) {
    let Constants;
    (function (Constants) {
        /** The tool type. */
        let Type;
        (function (Type) {
            Type["FUNCTION"] = "function";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextChatParameterTools.Constants || (TextChatParameterTools.Constants = {}));
})(TextChatParameterTools = exports.TextChatParameterTools || (exports.TextChatParameterTools = {}));
var TextChatResponseFormat;
(function (TextChatResponseFormat) {
    let Constants;
    (function (Constants) {
        /**
         * Used to enable JSON mode, which guarantees the message the model generates is valid JSON.
         * **Important:** when using JSON mode, you must also instruct the model to produce JSON
         * yourself via a system or user message. Without this, the model may generate an unending
         * stream of whitespace until the generation reaches the token limit, resulting in a
         * long-running and seemingly "stuck" request. Also note that the message content may be
         * partially cut off if `finish_reason="length"`, which indicates the generation exceeded
         * `max_tokens` or the conversation exceeded the max context length.
         */
        let Type;
        (function (Type) {
            Type["JSON_OBJECT"] = "json_object";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextChatResponseFormat.Constants || (TextChatResponseFormat.Constants = {}));
})(TextChatResponseFormat = exports.TextChatResponseFormat || (exports.TextChatResponseFormat = {}));
var TextChatResultChoice;
(function (TextChatResultChoice) {
    let Constants;
    (function (Constants) {
        /**
         * The reason why the call stopped, can be one of: - `stop` - The model hit a natural stop point
         * or a provided stop sequence. - `length` - The maximum number of tokens specified in the
         * request was reached. - `tool_calls` - The model called a tool.
         *
         * - `time_limit`` - Time limit reached. - `cancelled`- Request canceled by the client. -`error`-
         *   Error encountered. -`null`
         * - API response still in progress or incomplete.
         */
        let FinishReason;
        (function (FinishReason) {
            FinishReason["STOP"] = "stop";
            FinishReason["LENGTH"] = "length";
            FinishReason["TOOL_CALLS"] = "tool_calls";
            FinishReason["TIME_LIMIT"] = "time_limit";
            FinishReason["CANCELLED"] = "cancelled";
            FinishReason["ERROR"] = "error";
        })(FinishReason = Constants.FinishReason || (Constants.FinishReason = {}));
    })(Constants = TextChatResultChoice.Constants || (TextChatResultChoice.Constants = {}));
})(TextChatResultChoice = exports.TextChatResultChoice || (exports.TextChatResultChoice = {}));
var TextChatResultChoiceStream;
(function (TextChatResultChoiceStream) {
    let Constants;
    (function (Constants) {
        /**
         * The reason why the call stopped, can be one of: - `stop` - The model hit a natural stop point
         * or a provided stop sequence. - `length` - The maximum number of tokens specified in the
         * request was reached. - `tool_calls` - The model called a tool.
         *
         * - `time_limit`` - Time limit reached. - `cancelled`- Request canceled by the client. -`error`-
         *   Error encountered. -`null`
         * - API response still in progress or incomplete.
         */
        let FinishReason;
        (function (FinishReason) {
            FinishReason["STOP"] = "stop";
            FinishReason["LENGTH"] = "length";
            FinishReason["TOOL_CALLS"] = "tool_calls";
            FinishReason["TIME_LIMIT"] = "time_limit";
            FinishReason["CANCELLED"] = "cancelled";
            FinishReason["ERROR"] = "error";
        })(FinishReason = Constants.FinishReason || (Constants.FinishReason = {}));
    })(Constants = TextChatResultChoiceStream.Constants || (TextChatResultChoiceStream.Constants = {}));
})(TextChatResultChoiceStream = exports.TextChatResultChoiceStream || (exports.TextChatResultChoiceStream = {}));
var TextChatToolChoiceTool;
(function (TextChatToolChoiceTool) {
    let Constants;
    (function (Constants) {
        /** The tool type. */
        let Type;
        (function (Type) {
            Type["FUNCTION"] = "function";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextChatToolChoiceTool.Constants || (TextChatToolChoiceTool.Constants = {}));
})(TextChatToolChoiceTool = exports.TextChatToolChoiceTool || (exports.TextChatToolChoiceTool = {}));
var TextExtractionDataReference;
(function (TextExtractionDataReference) {
    let Constants;
    (function (Constants) {
        /** The data source type. */
        let Type;
        (function (Type) {
            Type["CONNECTION_ASSET"] = "connection_asset";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextExtractionDataReference.Constants || (TextExtractionDataReference.Constants = {}));
})(TextExtractionDataReference = exports.TextExtractionDataReference || (exports.TextExtractionDataReference = {}));
var TextExtractionResults;
(function (TextExtractionResults) {
    let Constants;
    (function (Constants) {
        /** The status of the request. */
        let Status;
        (function (Status) {
            Status["SUBMITTED"] = "submitted";
            Status["UPLOADING"] = "uploading";
            Status["RUNNING"] = "running";
            Status["DOWNLOADING"] = "downloading";
            Status["DOWNLOADED"] = "downloaded";
            Status["COMPLETED"] = "completed";
            Status["FAILED"] = "failed";
        })(Status = Constants.Status || (Constants.Status = {}));
    })(Constants = TextExtractionResults.Constants || (TextExtractionResults.Constants = {}));
})(TextExtractionResults = exports.TextExtractionResults || (exports.TextExtractionResults = {}));
var TextGenParameters;
(function (TextGenParameters) {
    let Constants;
    (function (Constants) {
        /**
         * Represents the strategy used for picking the tokens during generation of the output text.
         * During text generation when parameter value is set to greedy, each successive token
         * corresponds to the highest probability token given the text that has already been generated.
         * This strategy can lead to repetitive results especially for longer output sequences. The
         * alternative sample strategy generates text by picking subsequent tokens based on the
         * probability distribution of possible next tokens defined by (i.e., conditioned on) the
         * already-generated text and the top_k and top_p parameters described below. See this
         * [url](https://huggingface.co/blog/how-to-generate) for an informative article about text
         * generation.
         */
        let DecodingMethod;
        (function (DecodingMethod) {
            DecodingMethod["SAMPLE"] = "sample";
            DecodingMethod["GREEDY"] = "greedy";
        })(DecodingMethod = Constants.DecodingMethod || (Constants.DecodingMethod = {}));
    })(Constants = TextGenParameters.Constants || (TextGenParameters.Constants = {}));
})(TextGenParameters = exports.TextGenParameters || (exports.TextGenParameters = {}));
var TextGenResponseFieldsResultsItem;
(function (TextGenResponseFieldsResultsItem) {
    let Constants;
    (function (Constants) {
        /**
         * The reason why the call stopped, can be one of: - not_finished
         *
         * - Possibly more tokens to be streamed. - max_tokens - Maximum requested tokens reached. -
         *   eos_token
         * - End of sequence token encountered. - cancelled - Request canceled by the client.
         * - Time_limit - Time limit reached. - stop_sequence - Stop sequence encountered. - token_limit -
         *   Token limit reached. - error - Error encountered. Note that these values will be
         *   lower-cased so test for values case insensitive.
         */
        let StopReason;
        (function (StopReason) {
            StopReason["NOT_FINISHED"] = "not_finished";
            StopReason["MAX_TOKENS"] = "max_tokens";
            StopReason["EOS_TOKEN"] = "eos_token";
            StopReason["CANCELLED"] = "cancelled";
            StopReason["TIME_LIMIT"] = "time_limit";
            StopReason["STOP_SEQUENCE"] = "stop_sequence";
            StopReason["TOKEN_LIMIT"] = "token_limit";
            StopReason["ERROR"] = "error";
        })(StopReason = Constants.StopReason || (Constants.StopReason = {}));
    })(Constants = TextGenResponseFieldsResultsItem.Constants || (TextGenResponseFieldsResultsItem.Constants = {}));
})(TextGenResponseFieldsResultsItem = exports.TextGenResponseFieldsResultsItem || (exports.TextGenResponseFieldsResultsItem = {}));
var TrainingStatus;
(function (TrainingStatus) {
    let Constants;
    (function (Constants) {
        /** Current state of training. */
        let State;
        (function (State) {
            State["QUEUED"] = "queued";
            State["PENDING"] = "pending";
            State["RUNNING"] = "running";
            State["STORING"] = "storing";
            State["COMPLETED"] = "completed";
            State["FAILED"] = "failed";
            State["CANCELED"] = "canceled";
        })(State = Constants.State || (Constants.State = {}));
    })(Constants = TrainingStatus.Constants || (TrainingStatus.Constants = {}));
})(TrainingStatus = exports.TrainingStatus || (exports.TrainingStatus = {}));
var ChatItem;
(function (ChatItem) {
    let Constants;
    (function (Constants) {
        /** Type */
        let Type;
        (function (Type) {
            Type["QUESTION"] = "question";
            Type["ANSWER"] = "answer";
        })(Type = Constants.Type || (Constants.Type = {}));
        /** Status */
        let Status;
        (function (Status) {
            Status["READY"] = "ready";
            Status["ERROR"] = "error";
        })(Status = Constants.Status || (Constants.Status = {}));
    })(Constants = ChatItem.Constants || (ChatItem.Constants = {}));
})(ChatItem = exports.ChatItem || (exports.ChatItem = {}));
var PromptLock;
(function (PromptLock) {
    let Constants;
    (function (Constants) {
        /**
         * Lock type: 'edit' for working on prompts/templates or 'governance'. Can only be supplied in
         * PUT /lock requests.
         */
        let LockType;
        (function (LockType) {
            LockType["EDIT"] = "edit";
            LockType["GOVERNANCE"] = "governance";
        })(LockType = Constants.LockType || (Constants.LockType = {}));
    })(Constants = PromptLock.Constants || (PromptLock.Constants = {}));
})(PromptLock = exports.PromptLock || (exports.PromptLock = {}));
var WxPromptResponse;
(function (WxPromptResponse) {
    let Constants;
    (function (Constants) {
        /** Input mode in use for the prompt. */
        let InputMode;
        (function (InputMode) {
            InputMode["STRUCTURED"] = "structured";
            InputMode["FREEFORM"] = "freeform";
            InputMode["CHAT"] = "chat";
            InputMode["DETACHED"] = "detached";
        })(InputMode = Constants.InputMode || (Constants.InputMode = {}));
    })(Constants = WxPromptResponse.Constants || (WxPromptResponse.Constants = {}));
})(WxPromptResponse = exports.WxPromptResponse || (exports.WxPromptResponse = {}));
var WxPromptSessionEntry;
(function (WxPromptSessionEntry) {
    let Constants;
    (function (Constants) {
        /** Input mode in use for the prompt. */
        let InputMode;
        (function (InputMode) {
            InputMode["STRUCTURED"] = "structured";
            InputMode["FREEFORM"] = "freeform";
            InputMode["CHAT"] = "chat";
        })(InputMode = Constants.InputMode || (Constants.InputMode = {}));
    })(Constants = WxPromptSessionEntry.Constants || (WxPromptSessionEntry.Constants = {}));
})(WxPromptSessionEntry = exports.WxPromptSessionEntry || (exports.WxPromptSessionEntry = {}));
var TextChatMessagesTextChatMessageAssistant;
(function (TextChatMessagesTextChatMessageAssistant) {
    let Constants;
    (function (Constants) {
        /** The role of the messages author. */
        let Role;
        (function (Role) {
            Role["ASSISTANT"] = "assistant";
            Role["SYSTEM"] = "system";
            Role["TOOL"] = "tool";
            Role["USER"] = "system";
        })(Role = Constants.Role || (Constants.Role = {}));
    })(Constants = TextChatMessagesTextChatMessageAssistant.Constants || (TextChatMessagesTextChatMessageAssistant.Constants = {}));
})(TextChatMessagesTextChatMessageAssistant = exports.TextChatMessagesTextChatMessageAssistant || (exports.TextChatMessagesTextChatMessageAssistant = {}));
var TextChatMessagesTextChatMessageSystem;
(function (TextChatMessagesTextChatMessageSystem) {
    let Constants;
    (function (Constants) {
        /** The role of the messages author. */
        let Role;
        (function (Role) {
            Role["ASSISTANT"] = "assistant";
            Role["SYSTEM"] = "system";
            Role["TOOL"] = "tool";
            Role["USER"] = "user";
        })(Role = Constants.Role || (Constants.Role = {}));
    })(Constants = TextChatMessagesTextChatMessageSystem.Constants || (TextChatMessagesTextChatMessageSystem.Constants = {}));
})(TextChatMessagesTextChatMessageSystem = exports.TextChatMessagesTextChatMessageSystem || (exports.TextChatMessagesTextChatMessageSystem = {}));
var TextChatMessagesTextChatMessageTool;
(function (TextChatMessagesTextChatMessageTool) {
    let Constants;
    (function (Constants) {
        /** The role of the messages author. */
        let Role;
        (function (Role) {
            Role["ASSISTANT"] = "assistant";
            Role["SYSTEM"] = "system";
            Role["TOOL"] = "tool";
            Role["USER"] = "user";
        })(Role = Constants.Role || (Constants.Role = {}));
    })(Constants = TextChatMessagesTextChatMessageTool.Constants || (TextChatMessagesTextChatMessageTool.Constants = {}));
})(TextChatMessagesTextChatMessageTool = exports.TextChatMessagesTextChatMessageTool || (exports.TextChatMessagesTextChatMessageTool = {}));
var TextChatMessagesTextChatMessageUser;
(function (TextChatMessagesTextChatMessageUser) {
    let Constants;
    (function (Constants) {
        /** The role of the messages author. */
        let Role;
        (function (Role) {
            Role["ASSISTANT"] = "assistant";
            Role["SYSTEM"] = "system";
            Role["TOOL"] = "tool";
            Role["USER"] = "user";
        })(Role = Constants.Role || (Constants.Role = {}));
    })(Constants = TextChatMessagesTextChatMessageUser.Constants || (TextChatMessagesTextChatMessageUser.Constants = {}));
})(TextChatMessagesTextChatMessageUser = exports.TextChatMessagesTextChatMessageUser || (exports.TextChatMessagesTextChatMessageUser = {}));
var TextChatUserContentsTextChatUserImageURLContent;
(function (TextChatUserContentsTextChatUserImageURLContent) {
    let Constants;
    (function (Constants) {
        /** The type of the user content. */
        let Type;
        (function (Type) {
            Type["TEXT"] = "text";
            Type["IMAGE_URL"] = "image_url";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextChatUserContentsTextChatUserImageURLContent.Constants || (TextChatUserContentsTextChatUserImageURLContent.Constants = {}));
})(TextChatUserContentsTextChatUserImageURLContent = exports.TextChatUserContentsTextChatUserImageURLContent || (exports.TextChatUserContentsTextChatUserImageURLContent = {}));
var TextChatUserContentsTextChatUserTextContent;
(function (TextChatUserContentsTextChatUserTextContent) {
    let Constants;
    (function (Constants) {
        /** The type of the user content. */
        let Type;
        (function (Type) {
            Type["TEXT"] = "text";
            Type["IMAGE_URL"] = "image_url";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextChatUserContentsTextChatUserTextContent.Constants || (TextChatUserContentsTextChatUserTextContent.Constants = {}));
})(TextChatUserContentsTextChatUserTextContent = exports.TextChatUserContentsTextChatUserTextContent || (exports.TextChatUserContentsTextChatUserTextContent = {}));
var FineTuningEntity;
(function (FineTuningEntity) {
    let Constants;
    (function (Constants) {
        /** The `type` of Fine Tuning training. The `type` is set to `ilab` for InstructLab training. */
        let Type;
        (function (Type) {
            Type["ILAB"] = "ilab";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = FineTuningEntity.Constants || (FineTuningEntity.Constants = {}));
})(FineTuningEntity = exports.FineTuningEntity || (exports.FineTuningEntity = {}));
var FineTuningPeftParameters;
(function (FineTuningPeftParameters) {
    let Constants;
    (function (Constants) {
        /**
         * This field must not be set while creating a fine tuning job with InstructLab. The type
         * specification for a LoRA or QLoRA Fine Tuning job. If type is set to `none`, no other
         * parameters in this object need to be specified.
         */
        let Type;
        (function (Type) {
            Type["LORA"] = "lora";
            Type["QLORA"] = "qlora";
            Type["NONE"] = "none";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = FineTuningPeftParameters.Constants || (FineTuningPeftParameters.Constants = {}));
})(FineTuningPeftParameters = exports.FineTuningPeftParameters || (exports.FineTuningPeftParameters = {}));
var DocumentExtractionStatus;
(function (DocumentExtractionStatus) {
    let Constants;
    (function (Constants) {
        /** Current state of document extraction. */
        let State;
        (function (State) {
            State["QUEUED"] = "queued";
            State["PENDING"] = "pending";
            State["RUNNING"] = "running";
            State["STORING"] = "storing";
            State["COMPLETED_AT"] = "completed_at";
            State["FAILED"] = "failed";
            State["CANCELED"] = "canceled";
        })(State = Constants.State || (Constants.State = {}));
    })(Constants = DocumentExtractionStatus.Constants || (DocumentExtractionStatus.Constants = {}));
})(DocumentExtractionStatus = exports.DocumentExtractionStatus || (exports.DocumentExtractionStatus = {}));
var SyntheticDataGenerationDataReference;
(function (SyntheticDataGenerationDataReference) {
    let Constants;
    (function (Constants) {
        /** The data source type like `connection_asset` or `data_asset`. */
        let Type;
        (function (Type) {
            Type["CONNECTION_ASSET"] = "connection_asset";
            Type["DATA_ASSET"] = "data_asset";
            Type["CONTAINER"] = "container";
            Type["URL"] = "url";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = SyntheticDataGenerationDataReference.Constants || (SyntheticDataGenerationDataReference.Constants = {}));
})(SyntheticDataGenerationDataReference = exports.SyntheticDataGenerationDataReference || (exports.SyntheticDataGenerationDataReference = {}));
var SyntheticDataGenerationStatus;
(function (SyntheticDataGenerationStatus) {
    let Constants;
    (function (Constants) {
        /** The status of the job. */
        let State;
        (function (State) {
            State["QUEUED"] = "queued";
            State["PENDING"] = "pending";
            State["RUNNING"] = "running";
            State["STORING"] = "storing";
            State["COMPLETED"] = "completed";
            State["FAILED"] = "failed";
            State["CANCELED"] = "canceled";
        })(State = Constants.State || (Constants.State = {}));
    })(Constants = SyntheticDataGenerationStatus.Constants || (SyntheticDataGenerationStatus.Constants = {}));
})(SyntheticDataGenerationStatus = exports.SyntheticDataGenerationStatus || (exports.SyntheticDataGenerationStatus = {}));
var TaxonomyStatus;
(function (TaxonomyStatus) {
    let Constants;
    (function (Constants) {
        /** The status of the job. */
        let State;
        (function (State) {
            State["QUEUED"] = "queued";
            State["PENDING"] = "pending";
            State["RUNNING"] = "running";
            State["STORING"] = "storing";
            State["COMPLETED"] = "completed";
            State["FAILED"] = "failed";
            State["CANCELED"] = "canceled";
        })(State = Constants.State || (Constants.State = {}));
    })(Constants = TaxonomyStatus.Constants || (TaxonomyStatus.Constants = {}));
})(TaxonomyStatus = exports.TaxonomyStatus || (exports.TaxonomyStatus = {}));
var ModelResourceEntity;
(function (ModelResourceEntity) {
    let Constants;
    (function (Constants) {
        /** The upload state. */
        let ContentImportState;
        (function (ContentImportState) {
            ContentImportState["RUNNING"] = "running";
            ContentImportState["FAILED"] = "failed";
            ContentImportState["COMPLETED"] = "completed";
        })(ContentImportState = Constants.ContentImportState || (Constants.ContentImportState = {}));
    })(Constants = ModelResourceEntity.Constants || (ModelResourceEntity.Constants = {}));
})(ModelResourceEntity = exports.ModelResourceEntity || (exports.ModelResourceEntity = {}));
var ContentLocation;
(function (ContentLocation) {
    let Constants;
    (function (Constants) {
        /** The data source type like `connection_asset` or `data_asset`. */
        let Type;
        (function (Type) {
            Type["CONNECTION_ASSET"] = "connection_asset";
            Type["DATA_ASSET"] = "data_asset";
            Type["URL"] = "url";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = ContentLocation.Constants || (ContentLocation.Constants = {}));
})(ContentLocation = exports.ContentLocation || (exports.ContentLocation = {}));
var DocumentExtractionObjectLocation;
(function (DocumentExtractionObjectLocation) {
    let Constants;
    (function (Constants) {
        /** The data source type. This field must be set to `container`. */
        let Type;
        (function (Type) {
            Type["CONTAINER"] = "container";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = DocumentExtractionObjectLocation.Constants || (DocumentExtractionObjectLocation.Constants = {}));
})(DocumentExtractionObjectLocation = exports.DocumentExtractionObjectLocation || (exports.DocumentExtractionObjectLocation = {}));
var ObjectLocationGithub;
(function (ObjectLocationGithub) {
    let Constants;
    (function (Constants) {
        /** The data source type, for now only `github` is supported. */
        let Type;
        (function (Type) {
            Type["GITHUB"] = "github";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = ObjectLocationGithub.Constants || (ObjectLocationGithub.Constants = {}));
})(ObjectLocationGithub = exports.ObjectLocationGithub || (exports.ObjectLocationGithub = {}));
var TextClassificationDataReference;
(function (TextClassificationDataReference) {
    let Constants;
    (function (Constants) {
        /** The data source type. */
        let Type;
        (function (Type) {
            Type["CONNECTION_ASSET"] = "connection_asset";
            Type["CONTAINER"] = "container";
        })(Type = Constants.Type || (Constants.Type = {}));
    })(Constants = TextClassificationDataReference.Constants || (TextClassificationDataReference.Constants = {}));
})(TextClassificationDataReference = exports.TextClassificationDataReference || (exports.TextClassificationDataReference = {}));
var TextClassificationParameters;
(function (TextClassificationParameters) {
    let Constants;
    (function (Constants) {
        /**
         * If OCR should be used when processing a document. An empty value allows the service to select
         * the best option for your processing mode. - `enabled`: OCR is run on embedded images, OCR is
         * only run if no programmatic text could be extracted from the area. - `disabled`: OCR is not
         * run, no information is extracted from images or scanned documents.
         *
         * - `forced`: WDU will take a picture of the page and run OCR across it, this applies to all
         *   documents even purely programmatic ones.
         */
        let OcrMode;
        (function (OcrMode) {
            OcrMode["DISABLED"] = "disabled";
            OcrMode["ENABLED"] = "enabled";
            OcrMode["FORCED"] = "forced";
        })(OcrMode = Constants.OcrMode || (Constants.OcrMode = {}));
        /**
         * The classification mode. The value `exact` gives the exact schema name the the document is
         * classified to. The option `binary`` only gives whether the document is classified to a known
         * schema or not.
         */
        let ClassificationMode;
        (function (ClassificationMode) {
            ClassificationMode["EXACT"] = "exact";
            ClassificationMode["BINARY"] = "binary";
        })(ClassificationMode = Constants.ClassificationMode || (Constants.ClassificationMode = {}));
    })(Constants = TextClassificationParameters.Constants || (TextClassificationParameters.Constants = {}));
})(TextClassificationParameters = exports.TextClassificationParameters || (exports.TextClassificationParameters = {}));
var TextClassificationResults;
(function (TextClassificationResults) {
    let Constants;
    (function (Constants) {
        /** The status of the request. */
        let Status;
        (function (Status) {
            Status["SUBMITTED"] = "submitted";
            Status["UPLOADING"] = "uploading";
            Status["RUNNING"] = "running";
            Status["DOWNLOADING"] = "downloading";
            Status["DOWNLOADED"] = "downloaded";
            Status["COMPLETED"] = "completed";
            Status["FAILED"] = "failed";
        })(Status = Constants.Status || (Constants.Status = {}));
    })(Constants = TextClassificationResults.Constants || (TextClassificationResults.Constants = {}));
})(TextClassificationResults = exports.TextClassificationResults || (exports.TextClassificationResults = {}));
var TextClassificationSemanticConfig;
(function (TextClassificationSemanticConfig) {
    let Constants;
    (function (Constants) {
        /** Sets the merge strategy of the predefined and user defined input schemas. */
        let SchemasMergeStrategy;
        (function (SchemasMergeStrategy) {
            SchemasMergeStrategy["MERGE"] = "merge";
            SchemasMergeStrategy["REPLACE"] = "replace";
        })(SchemasMergeStrategy = Constants.SchemasMergeStrategy || (Constants.SchemasMergeStrategy = {}));
    })(Constants = TextClassificationSemanticConfig.Constants || (TextClassificationSemanticConfig.Constants = {}));
})(TextClassificationSemanticConfig = exports.TextClassificationSemanticConfig || (exports.TextClassificationSemanticConfig = {}));
//# sourceMappingURL=vml_v1.js.map