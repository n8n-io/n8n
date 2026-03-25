import '../../utils/dataTransfer/Clipboard.js';
import { isEditable } from '../../utils/edit/isEditable.js';
import { input } from '../input.js';
import { behavior } from './registry.js';

behavior.paste = (event, target, instance)=>{
    if (isEditable(target)) {
        return ()=>{
            var _event_clipboardData;
            const insertData = (_event_clipboardData = event.clipboardData) === null || _event_clipboardData === undefined ? undefined : _event_clipboardData.getData('text');
            if (insertData) {
                input(instance, target, insertData, 'insertFromPaste');
            }
        };
    }
};
