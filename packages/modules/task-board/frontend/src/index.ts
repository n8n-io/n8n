// The module's only public entry. The shell imports the descriptor from here via
// `modules.manifest.ts`; anything else the shell (or a test) needs must be exported
// here too — deep paths into `src/` are not part of the contract.
export { TaskBoardModule } from './task-board.module';
export {
	PROJECT_TASK_BOARDS_VIEW,
	TASK_BOARD_VIEW,
	TASK_BOARDS_VIEW,
} from './task-board.constants';
