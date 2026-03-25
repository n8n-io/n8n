import Prompt = require("./base");
import inquirer = require("../..");
import { Interface as ReadlineInterface } from "readline";

/**
 * The question-options for the `ConfirmPrompt<T>`.
 */
type Question = inquirer.ConfirmQuestionOptions<inquirer.Answers>;

/**
 * Represents a prompt which provides a message to confirm.
 *
 * @template TQuestion
 * The options for the question.
 */
declare class ConfirmPrompt<TQuestion extends Question = Question> extends Prompt<TQuestion> {
    /**
     * Initializes a new instance of the `ConfirmPrompt<T>` class.
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
    constructor(questions: TQuestion, readLine: ReadlineInterface, answers: inquirer.Answers);

    /**
     * Renders the prompt.
     *
     * @param answer
     * The answer provided by the user.
     */
    protected render(answer?: boolean): this;

    /**
     * Handles the `success`-event of the prompt.
     *
     * @param input
     * The input provided by the user.
     */
    protected onEnd(input: string): void;

    /**
     * Handles the `Keypress`-event of the prompt.
     */
    protected onKeypress(): void;
}

export = ConfirmPrompt;
