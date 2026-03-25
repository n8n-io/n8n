import Prompt = require("./base");
import inquirer = require("../..");
import Paginator = require("../utils/paginator");
import { Interface as ReadlineInterface } from "readline";

/**
 * The question-options for the `ListPrompt<T>`.
 */
type Question = inquirer.ListQuestionOptions<inquirer.Answers>;

/**
 * Represents a prompt which provides a list to choose an answer from.
 *
 * @template TQuestion
 * The options for the question.
 */
declare class ListPrompt<TQuestion extends Question = Question> extends Prompt<TQuestion> {
    /**
     * Resolves the value of the prompt.
     */
    protected done: (value: any) => void;

    /**
     * Gets or sets a value indicating whether the prompt has been rendered the first time.
     */
    protected firstRender: boolean;

    /**
     * The index of the selected choice.
     */
    protected selected: number;

    /**
     * Gets or sets an object for paginating the content.
     */
    protected paginator: Paginator;

    /**
     * Initializes a new instance of the `ListPrompt<T>` class.
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
     */
    protected render(): void;

    /**
     * Gets the current value of the prompt.
     */
    protected getCurrentValue(): any;

    /**
     * Handles the `upKey`-event.
     */
    protected onUpKey(): void;

    /**
     * Handles the `downKey`-event.
     */
    protected onDownKey(): void;

    /**
     * Handles the `numberKey`-event.
     *
     * @param input
     * The number that has been pressed.
     */
    protected onNumberKey(input: number): void;

    /**
     * Handles the `success`-event of the prompt.
     *
     * @param value
     * The value of the prompt.
     */
    protected onSubmit(value: any): void;
}

export = ListPrompt;
