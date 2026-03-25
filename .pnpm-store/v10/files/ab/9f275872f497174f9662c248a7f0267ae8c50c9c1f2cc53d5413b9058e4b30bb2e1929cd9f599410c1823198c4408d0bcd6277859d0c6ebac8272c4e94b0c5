'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var transfer = require('../transfer.js');

const useCheckedChange = (checkedState, emit) => {
  const onSourceCheckedChange = (val, movedKeys) => {
    checkedState.leftChecked = val;
    if (!movedKeys)
      return;
    emit(transfer.LEFT_CHECK_CHANGE_EVENT, val, movedKeys);
  };
  const onTargetCheckedChange = (val, movedKeys) => {
    checkedState.rightChecked = val;
    if (!movedKeys)
      return;
    emit(transfer.RIGHT_CHECK_CHANGE_EVENT, val, movedKeys);
  };
  return {
    onSourceCheckedChange,
    onTargetCheckedChange
  };
};

exports.useCheckedChange = useCheckedChange;
//# sourceMappingURL=use-checked-change.js.map
