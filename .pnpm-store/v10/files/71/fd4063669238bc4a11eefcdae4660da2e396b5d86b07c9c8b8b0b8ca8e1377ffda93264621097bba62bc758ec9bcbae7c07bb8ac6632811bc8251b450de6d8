const React = require('react');

function ToggleOption({ children, filter, activeFilters, setFilters }) {
    return (
        <button
            className={
                'toggle__option ' + (activeFilters[filter] ? 'is-toggled' : '')
            }
            onClick={() =>
                setFilters({
                    ...activeFilters,
                    [filter]: !activeFilters[filter]
                })
            }
        >
            {children}
        </button>
    );
}

module.exports = function FilterToggle({ activeFilters, setFilters }) {
    return (
        <div className="toggle">
            <div className="toggle__label">Filter:</div>
            <div className="toggle__options">
                <ToggleOption
                    filter="low"
                    activeFilters={activeFilters}
                    setFilters={setFilters}
                >
                    Low
                </ToggleOption>
                <ToggleOption
                    filter="medium"
                    activeFilters={activeFilters}
                    setFilters={setFilters}
                >
                    Medium
                </ToggleOption>
                <ToggleOption
                    filter="high"
                    activeFilters={activeFilters}
                    setFilters={setFilters}
                >
                    High
                </ToggleOption>
            </div>
        </div>
    );
};
