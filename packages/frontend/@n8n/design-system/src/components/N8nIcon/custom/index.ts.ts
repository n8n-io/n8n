import Binary from './binary.svg';
import Json from './json.svg';
import PopOut from './pop-out.svg';
import Schema from './schema.svg';
import Spinner from './spinner.svg';
import StatusCanceled from './status-canceled.svg';
import StatusCompleted from './status-completed.svg';
import StatusError from './status-error.svg';
import StatusNew from './status-new.svg';
import StatusUnknown from './status-unknown.svg';
import StatusWaiting from './status-waiting.svg';
import StatusWarning from './status-warning.svg';
import Text from './text.svg';
import Toolbox from './toolbox.svg';
import Triangle from './triangle.svg';
import Variable from './variable.svg';
import VectorSquare from './vector-square.svg';
import Xmark from './xmark.svg';

export const customIcons = {
	variable: Variable,
	'pop-out': PopOut,
	xmark: Xmark,
	triangle: Triangle,
	'status-completed': StatusCompleted,
	'status-waiting': StatusWaiting,
	'status-error': StatusError,
	'status-canceled': StatusCanceled,
	'status-new': StatusNew,
	'status-unknown': StatusUnknown,
	'status-warning': StatusWarning,
	'vector-square': VectorSquare,
	schema: Schema,
	json: Json,
	binary: Binary,
	text: Text,
	toolbox: Toolbox,
	spinner: Spinner,
} as const;
