import inquirer = require("../..");
import Prompt = require("./base");
import { Interface as ReadLineInterface } from "readline";
import Paginator = require("../utils/paginator");

/**
 * The question-options for the `ChoicePrompt<T>`.
 */
type Question = inquirer.CheckboxQuestionOptions<inquirer.Answers>;

/**
 * Represents a prompt which provides a set of choices to check.
 *
 * @template TQuestion
 * The options for the question.
 */
declare class CheckboxPrompt<TQuestion extends Question = Question> extends Prompt<TQuestion> {
    /**
     * Gets or sets the index of the currently focused choice.
     */
    protected pointer: number;

    /**
     * Gets or sets an object for paginating the content.
     */
    protected paginator: Paginator;

    /**
     * Initializes a new instance of the `CheckboxPrompt<T>` class.
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
    constructor(question: TQuestion, readLine: ReadLineInterface, answers: inquirer.Answers);

    /**
     * Renders the prompt.
     *
     * @param error
     * An error message to render.
     */
    protected render(error?: string): void;

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

    /**
     * Gets the current value of the prompt.
     *
     * @returns
     * The current value of the prompt.
     */
    protected getCurrentValue(): any;

    /**
     * Handles the `UpdKey`-event of the prompt.
     */
    protected onUpKey(): void;

    /**
     * Handles the `DownKey`-event of the prompt.
     */
    protected onDownKey(): void;

    /**
     * Handles the `NumberKey`-event of the prompt.
     *
     * @param input
     * The number which has been pressed.
     */
    protected onNumberKey(input: number): void;

    /**
     * Handles the `SpaceKey`-event of the prompt.
     */
    protected onSpaceKey(): void;

    /**
     * Handles the `AllKey`-event of the prompt.
     */
    protected onAllKey(): void;

    /**
     * Handles the `InverseKey`-event of the prompt.
     */
    protected onInverseKey(): void;

    /**
     * Toggles the state of a choice.
     *
     * @param index
     * The index of the choice to toggle.
     */
    protected toggleChoice(index: number): void;
}

export = CheckboxPrompt;
