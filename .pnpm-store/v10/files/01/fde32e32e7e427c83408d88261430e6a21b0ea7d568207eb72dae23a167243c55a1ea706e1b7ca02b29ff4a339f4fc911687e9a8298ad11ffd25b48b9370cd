/**
 * This file is responsible for:
 * - Loading and parsing the `evals.config.json` file, which defines tasks (evaluations) and their associated categories.
 * - Building a lookup structure (`tasksByName`) to map each task name to its categories.
 * - Filtering tasks based on command-line arguments (e.g., `filterByEvalName`) and ensuring that requested tasks exist.
 * - Determining which models to use for evaluations, depending on the category and environment variables.
 * - Validating that the chosen models are supported.
 *
 * The exported objects (`tasksByName`, `MODELS`, `config`) are used by the main evaluation script and other modules
 * to know which tasks and models are available, and to configure the evaluations accordingly.
 */
import { AvailableModel } from "@/dist";
declare const config: any;
declare const tasksByName: Record<string, {
    categories: string[];
}>;
declare const MODELS: AvailableModel[];
export { tasksByName, MODELS, config };
