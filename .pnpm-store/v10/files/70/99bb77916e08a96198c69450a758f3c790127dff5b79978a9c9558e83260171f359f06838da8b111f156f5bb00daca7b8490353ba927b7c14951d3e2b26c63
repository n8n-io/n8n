import Prompt = require("./base");
import inquirer = require("../..");
import { Interface as ReadlineInterface } from "readline";

/**
 * The question for the `PasswordPrompt<T>`.
 */
type Question = inquirer.PasswordQuestionOptions<inquirer.Answers>;

/**
 * Represents a prompt which allows the user to type a password.
 *
 * @template TQuestion
 * The options for the question.
 */
declare class PasswordPrompt<TQuestion extends Question = Question> extends Prompt<TQuestion> {
    /**
     * Resolves the value of the prompt.
     */
    protected done: (value: any) => void;

    /**
     * The answer to this prompt.
     */
    protected answer: any;

    /**
     * Initializes a new instance of the `PasswordPrompt<T>` class.
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
     * Renders the prompt.
     *
     * @param error
     * The error to render.
     */
    protected render(error?: string): void;

    /**
     * Filters the specified `input`.
     *
     * @param input
     * The input to filter.
     *
     * @returns
     * The filtered input.
     */
    protected filterInput(input: string): string;

    /**
     * Handles the `keypress`-event of the prompt.
     */
    protected onKeyPress(): void;

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

export = PasswordPrompt;
