const React = require('react');

module.exports = function FlattenButton({ setIsFlat, isFlat }) {
    return (
        <div className="toggle">
            <div className="toggle__label">Files:</div>
            <div className="toggle__options">
                <button
                    onClick={() => setIsFlat(!isFlat)}
                    className={
                        'toggle__option ' + (!isFlat ? 'is-toggled' : '')
                    }
                >
                    Tree
                </button>
                <button
                    onClick={() => setIsFlat(!isFlat)}
                    className={'toggle__option ' + (isFlat ? 'is-toggled' : '')}
                >
                    Flat
                </button>
            </div>{' '}
        </div>
    );
};
