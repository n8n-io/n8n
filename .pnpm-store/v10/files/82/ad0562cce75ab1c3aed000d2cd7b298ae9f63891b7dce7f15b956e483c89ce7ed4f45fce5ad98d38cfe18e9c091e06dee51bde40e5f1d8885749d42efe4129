import Prompt = require("./base");
import { Subject, Subscription } from "rxjs";
import inquirer = require("../..");
import { Interface as ReadlineInterface } from "readline";

/**
 * The question-options for the `EditorPrompt<T>`.
 */
type Question = inquirer.EditorQuestionOptions<inquirer.Answers>;

/**
 * Represents a prompt which provides a text-editor.
 *
 * @template TQuestion
 * The options for the question.
 */
declare class EditorPrompt<TQuestion extends Question = Question> extends Prompt<TQuestion> {
    /**
     * Resolves the value of the prompt.
     */
    protected done: (value: any) => void;

    /**
     * Gets or sets an object for subscribing to the editor-result.
     */
    protected editorResult: Subject<string>;

    /**
     * Gets or sets a subscription to the `line`-event.
     */
    protected lineSubscription: Subscription;

    /**
     * Gets or sets the initial text.
     */
    protected currentText: string;

    /**
     * Initializes a new instance of the `EditorPrompt<T>` class.
     *
     * @param question
     * The question to prompt the user to answer.
     *
     * @param readLine
     * An object for performing read from and write to the console.
     *
     * @param answers
     * The answer-object.
     */
    constructor(question: TQuestion, readLine: ReadlineInterface, answers: inquirer.Answers);

    /**
     * Runs the prompt.
     *
     * @param callback
     * The callback for resolving the result.
     */
    protected _run(callback: (value: any) => void): this;

    /**
     * Renders the prompt.
     *
     * @param error
     * The error to render.
     */
    protected render(error?: string): void;

    /**
     * Launches the default text-editor of the system.
     */
    protected startExternalEditor(): void;

    /**
     * Closes the external editor.
     *
     * @param error
     * Either the error which occurred while executing the external editor or `null`.
     *
     * @param result
     * The result of the editor.
     */
    protected endExternalEditor(error: Error, result: string): void;

    /**
     * Handles the `success`-event of the prompt.
     *
     * @param eventArgs
     * An object which contains event-data.
     */
    protected onEnd(eventArgs: inquirer.prompts.SuccessfulPromptStateData): void;

    /**
     * Handles the `error`-event of the prompt.
     *
     * @param eventArgs
     * An object which contains event-data.
     */
    protected onError(eventArgs: inquirer.prompts.FailedPromptStateData): void;
}

export = EditorPrompt;
