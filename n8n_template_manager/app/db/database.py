from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.workflow import Base  # Import Base from the workflow model

DATABASE_URL = "sqlite:///./n8n_templates.db"

# Create the SQLAlchemy engine
# The connect_args={"check_same_thread": False} is needed only for SQLite.
# It's not needed for other databases.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class
# This will be used to create database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_db_and_tables():
    """
    Creates the database and all tables defined in the Base metadata.
    """
    Base.metadata.create_all(bind=engine)

# Example of how to use the session:
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()
