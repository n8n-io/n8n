import './styles.scss';

import { VIEW_COMPONENTS } from './components';
import { startViewRuntime } from './runtime';

startViewRuntime(window, VIEW_COMPONENTS);
