import { LEFT_CHECK_CHANGE_EVENT, RIGHT_CHECK_CHANGE_EVENT } from '../transfer.mjs';

const useCheckedChange = (checkedState, emit) => {
  const onSourceCheckedChange = (val, movedKeys) => {
    checkedState.leftChecked = val;
    if (!movedKeys)
      return;
    emit(LEFT_CHECK_CHANGE_EVENT, val, movedKeys);
  };
  const onTargetCheckedChange = (val, movedKeys) => {
    checkedState.rightChecked = val;
    if (!movedKeys)
      return;
    emit(RIGHT_CHECK_CHANGE_EVENT, val, movedKeys);
  };
  return {
    onSourceCheckedChange,
    onTargetCheckedChange
  };
};

export { useCheckedChange };
//# sourceMappingURL=use-checked-change.mjs.map
