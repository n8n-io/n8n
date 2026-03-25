import InputPrompt = require("./input");
import inquirer = require("../..");
import { Interface as ReadlineInterface } from "readline";

/**
 * The question for the `NumberPrompt<T>`.
 */
type Question = inquirer.NumberQuestionOptions<inquirer.Answers>;

/**
 * Provides a prompt which allows the user to type a number as answer.
 *
 * @template TQuestion
 * The options for the question.
 */
declare class NumberPrompt<TQuestion extends Question = Question> extends InputPrompt<TQuestion> {
    /**
     * Initializes a new instance of the `NumberPrompt<T>` class.
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
}

export = NumberPrompt;
