from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles # Added for static files
from fastapi.responses import HTMLResponse # Added for HTML response
import pathlib # Added for path manipulation

from app.api.endpoints import router as api_router # Import the router
from app.db.database import create_db_and_tables # To create DB tables on startup

# Create database and tables if they don't exist
# This is suitable for development/small deployments.
# For production, you might use Alembic for migrations.
create_db_and_tables()

app = FastAPI(title="n8n Template Manager API")

# Determine the base directory of the main.py file
# This assumes main.py is in the root of the n8n_template_manager directory
BASE_DIR = pathlib.Path(__file__).resolve().parent

# Include the API router
app.include_router(api_router, prefix="/api/v1")

# Serve static files (CSS, JS)
# The 'app/static' directory should be relative to where main.py is located.
# If main.py is in n8n_template_manager/, then 'app/static' is correct.
app.mount("/static", StaticFiles(directory=BASE_DIR / "app/static"), name="static")

@app.get("/", response_class=HTMLResponse) # Changed path from /app to /
async def read_root():
    """
    Root endpoint, serves the main HTML page.
    """
    index_html_path = BASE_DIR / "app/static/index.html"
    try:
        with open(index_html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Frontend not found. Ensure index.html is in app/static.</h1>", status_code=404)
    except Exception as e:
        return HTMLResponse(content=f"<h1>An error occurred: {e}</h1>", status_code=500)


# Optional: Add uvicorn startup for direct execution (for development)
if __name__ == "__main__":
    import uvicorn
    # Default host and port, can be configured via environment variables or CLI args
    # For development, it's common to run on 0.0.0.0 to be accessible from network
    # or 127.0.0.1 for local access only.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) # Added reload=True for dev
