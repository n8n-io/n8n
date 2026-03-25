// The index file for the spa running on the summary page
const React = require('react');
const ReactDOM = require('react-dom');
const SummaryTableHeader = require('./summaryTableHeader');
const SummaryTableLine = require('./summaryTableLine');
const SummaryHeader = require('./summaryHeader');
const getChildData = require('./getChildData');
const FlattenToggle = require('./flattenToggle');
const FilterToggle = require('./filterToggle');
const FileBreadcrumbs = require('./fileBreadcrumbs');
const { setLocation, decodeLocation } = require('./routing');

const { useState, useMemo, useEffect } = React;

const sourceData = window.data;
const metricsToShow = {};
for (let i = 0; i < window.metricsToShow.length; i++) {
    metricsToShow[window.metricsToShow[i]] = true;
}

let firstMount = true;

function App() {
    const routingDefaults = decodeLocation();

    const [activeSort, setSort] = useState(
        (routingDefaults && routingDefaults.activeSort) || {
            sortKey: 'file',
            order: 'desc'
        }
    );
    const [isFlat, setIsFlat] = useState(
        (routingDefaults && routingDefaults.isFlat) || false
    );
    const [activeFilters, setFilters] = useState(
        (routingDefaults && routingDefaults.activeFilters) || {
            low: true,
            medium: true,
            high: true
        }
    );
    const [expandedLines, setExpandedLines] = useState(
        (routingDefaults && routingDefaults.expandedLines) || []
    );
    const [fileFilter, setFileFilter] = useState(
        (routingDefaults && routingDefaults.fileFilter) || ''
    );
    const childData = useMemo(
        () =>
            getChildData(
                sourceData,
                metricsToShow,
                activeSort,
                isFlat,
                activeFilters,
                fileFilter
            ),
        [activeSort, isFlat, activeFilters, fileFilter]
    );
    const overallMetrics = sourceData.metrics;

    useEffect(() => {
        setLocation(
            firstMount,
            activeSort,
            isFlat,
            activeFilters,
            fileFilter,
            expandedLines
        );
        firstMount = false;
    }, [activeSort, isFlat, activeFilters, fileFilter, expandedLines]);

    useEffect(() => {
        window.onpopstate = () => {
            const routingState = decodeLocation();
            if (routingState) {
                // make sure all the state is set before rendering to avoid url updates
                // alternative is to merge all the states into one so it can be set in one go
                // https://github.com/facebook/react/issues/14259
                ReactDOM.unstable_batchedUpdates(() => {
                    setFilters(routingState.activeFilters);
                    setSort(routingState.activeSort);
                    setIsFlat(routingState.isFlat);
                    setExpandedLines(routingState.expandedLines);
                    setFileFilter(routingState.fileFilter);
                });
            }
        };
    }, []);

    return (
        <div className="layout">
            <div className="layout__section">
                <SummaryHeader
                    metrics={overallMetrics}
                    metricsToShow={metricsToShow}
                />
            </div>
            <div className="layout__section">
                <div className="toolbar">
                    <div className="toolbar__item">
                        <FlattenToggle setIsFlat={setIsFlat} isFlat={isFlat} />
                    </div>
                    <div className="toolbar__item">
                        <FilterToggle
                            activeFilters={activeFilters}
                            setFilters={setFilters}
                        />
                    </div>
                </div>
            </div>
            <div className="layout__section">
                <h1>
                    <FileBreadcrumbs
                        fileFilter={fileFilter}
                        setFileFilter={setFileFilter}
                    />
                </h1>
            </div>
            <div className="layout__section layout__section--fill">
                <table className="coverage-summary">
                    <SummaryTableHeader
                        onSort={newSort => {
                            setSort(newSort);
                        }}
                        activeSort={activeSort}
                        metricsToShow={metricsToShow}
                    />
                    <tbody>
                        {childData.map(child => (
                            <SummaryTableLine
                                {...child}
                                key={child.file}
                                metricsToShow={metricsToShow}
                                expandedLines={expandedLines}
                                setExpandedLines={setExpandedLines}
                                fileFilter={fileFilter}
                                setFileFilter={setFileFilter}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="layout__section center small quiet">
                Code coverage generated by{' '}
                <a
                    href="https://istanbul.js.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    istanbul
                </a>{' '}
                at {window.generatedDatetime}
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('app'));
